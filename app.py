import os, re, uuid, zipfile, shutil, mimetypes, json, datetime
from pathlib import Path
from urllib.parse import urlparse
from flask import (
    Flask, render_template, request, redirect, url_for, flash,
    Response, session, jsonify, abort, render_template_string, send_file
)
from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename

mimetypes.add_type("application/wasm", ".wasm")
mimetypes.add_type("application/octet-stream", ".data")

# --> Obtein algumas funões/tabelas do banco de dados (db.py)
from db import (
    init_db, cadastrar_usuario, listar_usuarios, buscar_usuario_por_email,
    listar_jogos, jogos_do_usuario, comprar_jogo,
    atualizar_senha_usuario, atualizar_role_usuario,
    registrar_build, listar_builds, buscar_build_por_slug,
    criar_jogo_por_build, deletar_build_por_slug,
    buscar_usuario_por_id, atualizar_usuario_basico, atualizar_avatar_usuario,
    listar_jogos_recentes, listar_em_alta, listar_descobertas, listar_spotlight_dev,
    inserir_midias, listar_midias_por_jogos,
    compras_detalhadas_do_usuario, obter_compra, deletar_compra, registrar_reembolso,
    set_jogo_delisted, listar_todos_jogos_admin, set_user_ban, deletar_jogo_definitivo,
    _dict_factory, DB_PATH, jogos_na_biblioteca,
    criar_ticket_suporte, listar_tickets_usuario, obter_ticket,
    listar_mensagens_ticket, adicionar_mensagem_ticket, atualizar_status_ticket,
    listar_jogos_pendentes_para_aprovar, atualizar_build_visibility_by_slug
)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")
GAMES_ROOT = os.path.join(STATIC_DIR, "games")
os.makedirs(GAMES_ROOT, exist_ok=True)

AVATARS_DIR = os.path.join(STATIC_DIR, "uploads", "avatars")
os.makedirs(AVATARS_DIR, exist_ok=True)

# --> arquivos base permitido e algumas categorias que possuem no site
ALLOWED_IMAGE_EXTS = {"png", "jpg", "jpeg", "webp"}
ALLOWED_VIDEO_EXTS = {"mp4", "webm", "mov"}
ALLOWED_ZIP_EXTS   = {"zip"}
VALID_CATEGORIES   = {"Ação", "RPG", "Esportes", "Simulação", "Aventura", "Outros"}

DEFAULT_USER_LEVEL = 1

app = Flask(
    __name__,
    template_folder=TEMPLATES_DIR,
    static_folder=STATIC_DIR,
    static_url_path="/static",
)
app.secret_key = "dev"

app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024 * 1024

init_db()


def send_email(to: str, subject: str, body: str) -> None:
    """
    Envio de email simulado (print no console).
    """
    if not to:
        return
    print("\n=== EMAIL (simulado) ===")
    print("Para   :", to)
    print("Assunto:", subject)
    print("Corpo:\n", body)
    print("========================\n")


def _ext_ok(filename, allowed):
    if not filename or "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in allowed


def slugify(text: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9\-\s_]", "", text).strip().lower()
    text = re.sub(r"\s+", "-", text)
    return text[:60] if text else str(uuid.uuid4())[:12]


def _public_url(u: str | None) -> str:
    """
    Normaliza caminhos relativos do banco (ex.: 'static/games/uuid/file.mp4')
    para URLs públicas acessíveis no template.
    """
    if not u:
        return ""
    u = u.replace("\\", "/")
    if u.startswith("/") or urlparse(u).scheme in ("http", "https"):
        return u
    if "static/" in u:
        rel = u.split("static/")[1]
        return url_for("static", filename=rel)
    return "/" + u


def _build_abs_dir(build_path: str) -> str:
    """
    A partir do campo build_path salvo no banco, resolve o caminho ABSOLUTO
    da pasta do build no disco.
    """
    p = (build_path or "").replace("\\", "/")
    if "static/" in p:
        rel = p.split("static/")[1]
        abs_dir = os.path.join(STATIC_DIR, rel)
    else:
        abs_dir = os.path.join(BASE_DIR, p)
    return os.path.normpath(abs_dir)


def login_required(view_func):
    from functools import wraps

    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if 'user_id' not in session:
            flash("Faça login para continuar.", "warning")
            return redirect(url_for("login"))
        return view_func(*args, **kwargs)

    return wrapper


def dev_required(view_func):
    from functools import wraps

    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if 'user_id' not in session:
            flash("Faça login para continuar.", "warning")
            return redirect(url_for("login"))
        if session.get('user_role') not in ('dev', 'admin'):
            abort(403)
        return view_func(*args, **kwargs)

    return wrapper


def admin_required(view_func):
    from functools import wraps

    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if 'user_id' not in session:
            flash("Faça login para continuar.", "warning")
            return redirect(url_for("login"))
        if session.get('user_role') != 'admin':
            abort(403)
        return view_func(*args, **kwargs)

    return wrapper


def _find_any_html(dest_dir: str) -> str | None:
    candidates = []
    for root, _, files in os.walk(dest_dir):
        for f in files:
            if f.lower().endswith(".html"):
                candidates.append(os.path.join(root, f))
    if not candidates:
        return None
    unreal_like = [p for p in candidates if "-html5-" in os.path.basename(p).lower()]
    if unreal_like:
        return max(unreal_like, key=lambda p: os.path.getsize(p))
    return max(candidates, key=lambda p: os.path.getsize(p))


def _is_unity_build_folder(dest_dir: str) -> bool:
    try:
        entries = [d.lower() for d in os.listdir(dest_dir)]
        return "build" in entries
    except Exception:
        return False


def _is_unreal_html5_drop(dest_dir: str) -> bool:
    found_wasm = False
    found_js = False
    for root, _, files in os.walk(dest_dir):
        for f in files:
            lf = f.lower()
            if lf.endswith(".wasm"):
                found_wasm = True
            if lf.endswith(".js"):
                found_js = True
    return found_wasm and found_js


try:
    from PIL import Image

    def _img_wh_is_1920x1080(file_storage) -> bool:
        try:
            im = Image.open(file_storage)
            w, h = im.size
            file_storage.stream.seek(0)
            return (w, h) == (1920, 1080)
        except Exception:
            file_storage.stream.seek(0)
            return True

except ImportError:

    def _img_wh_is_1920x1080(_fs) -> bool:
        return True


@app.route("/")
def index():
    recentes = listar_jogos_recentes(limit=8)
    em_alta = listar_em_alta(limit=8)
    descobertas = listar_descobertas(limit=12)
    spotlight = listar_spotlight_dev()
    return render_template(
        "index.html",
        recentes=recentes,
        em_alta=em_alta,
        descobertas=descobertas,
        spotlight=spotlight
    )


@app.route("/politicas")
def politicas():
    return render_template("politicas.html")


@app.route("/cadastrar", methods=["GET", "POST"])
def cadastrar():
    if request.method == "POST":
        nome = request.form.get("username")
        email = request.form.get("email")
        senha = request.form.get("password")
        confirmar = request.form.get("confirm_password")
        nickname = request.form.get("nickname") or None
        role = (request.form.get("role") or "user").strip().lower()
        if role not in ("user", "dev"):
            role = "user"

        if senha != confirmar:
            flash("As senhas não correspondem")
            return render_template("cadastrar.html")

        try:
            cadastrar_usuario(nome, email, senha, nickname, role)
            flash("Usuário Cadastrado")
            return redirect(url_for("login"))
        except Exception:
            flash("Email já cadastrado, por favor use outro")
            return Response(
                "<script>alert('Email já cadastrado, insira outro email');"
                "window.location.href='" + url_for('cadastrar') + "'</script>"
            )
    return render_template("cadastrar.html")


# --> Fazendo a verificação direto do Banco de dados para fazer a realização do login
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email")
        senha = request.form.get("password")
        usuario = buscar_usuario_por_email(email)
        if usuario and check_password_hash(usuario[3], senha):
            session['user_id'] = usuario[0]
            session['user_name'] = usuario[1]
            session['user_email'] = usuario[2]
            session['user_nick'] = usuario[4] or usuario[1]
            session['user_level'] = DEFAULT_USER_LEVEL
            session['user_role'] = usuario[5] or 'user'
            session['user_avatar'] = usuario[6]
            flash(f"Bem-vindo(a), {session['user_nick']}!", "success")
            return redirect(url_for("loja"))
        else:
            flash("⚠️ Credenciais inválidas!", "danger")
    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    flash("Você saiu da conta.", "info")
    return redirect(url_for("index"))


@app.route("/loja")
@login_required
def loja():
    user_id = session['user_id']
    games = listar_jogos()
    owned_ids = set(jogos_do_usuario(user_id))

    ids = [g["id"] for g in games]
    midias_map = listar_midias_por_jogos(ids)

    for g in games:
        g["capa_url"] = _public_url(g.get("capa_url"))
        g["trailer_url"] = _public_url(g.get("trailer_url"))

        mids = midias_map.get(g["id"], [])
        imgs = [_public_url(m["url"]) for m in mids if m["tipo"] == "image"]
        vids = [_public_url(m["url"]) for m in mids if m["tipo"] == "video"]
        g["_data_images"] = "|".join(imgs)
        g["_data_videos"] = "|".join(vids)

    return render_template("loja.html", games=games, owned_ids=owned_ids)


@app.route("/comprar/<int:jogo_id>", methods=["POST"])
@login_required
def comprar(jogo_id):
    if 'user_id' not in session:
        return jsonify({"ok": False, "auth": False, "msg": "Faça login"}), 401

    ok, err = comprar_jogo(session['user_id'], jogo_id)
    if ok:
        return jsonify({"ok": True})

    if err and ("UNIQUE" in err.upper() or "constraint" in err.lower()):
        return jsonify({"ok": True, "already_owned": True})

    return jsonify({"ok": False, "error": err or "erro_desconhecido"}), 400


@app.route("/biblioteca")
@login_required
def biblioteca():
    user_id = session.get('user_id')
    games = jogos_na_biblioteca(user_id)

    now = datetime.datetime.utcnow()

    for g in games:
        try:
            comprado_em = datetime.datetime.strptime(g["comprado_em"], "%Y-%m-%d %H:%M:%S")
        except Exception:
            comprado_em = datetime.datetime.fromisoformat(g["comprado_em"].split(".")[0])
        g["_pode_reembolso"] = (now - comprado_em) <= datetime.timedelta(days=3)
    return render_template("teca.html", games=games)


@app.route("/biblioteca/desinstalar/<int:jogo_id>", methods=["POST"])
@login_required
def biblioteca_desinstalar(jogo_id):
    return jsonify({"ok": True})


@app.route("/biblioteca/reembolso/<int:jogo_id>", methods=["POST"])
@login_required
def biblioteca_reembolso(jogo_id):
    user_id = session['user_id']
    compra = obter_compra(user_id, jogo_id)
    if not compra:
        return jsonify({"ok": False, "error": "compra_nao_encontrada"}), 404
    now = datetime.datetime.utcnow()
    try:
        comprado_em = datetime.datetime.strptime(compra["comprado_em"], "%Y-%m-%d %H:%M:%S")
    except Exception:
        comprado_em = datetime.datetime.fromisoformat(compra["comprado_em"].split(".")[0])
    if (now - comprado_em) > datetime.timedelta(days=3):
        return jsonify({"ok": False, "error": "fora_da_janela"}), 400

    deletar_compra(compra["id"])
    registrar_reembolso(user_id, jogo_id, compra["id"])
    return jsonify({"ok": True})


def _save_avatar(file_storage, user_id: int) -> str | None:
    if not file_storage or not file_storage.filename:
        return None
    if not _ext_ok(file_storage.filename, ALLOWED_IMAGE_EXTS):
        return None
    ext = file_storage.filename.rsplit(".", 1)[1].lower()
    fname = f"user{user_id}_{uuid.uuid4().hex[:8]}.{ext}"
    abs_path = os.path.join(AVATARS_DIR, secure_filename(fname))
    file_storage.save(abs_path)
    rel_from_base = os.path.relpath(abs_path, BASE_DIR).replace("\\", "/")
    return rel_from_base


@app.route("/perfilConfiguracoes", methods=["GET", "POST"])
@login_required
def perfilConfig():
    user_id = session['user_id']
    user = buscar_usuario_por_id(user_id)

    if request.method == "POST":
        new_name = (request.form.get("display_name") or "").strip()
        new_nick = (request.form.get("nickname") or "").strip() or None
        new_email = (request.form.get("email") or "").strip()

        try:
            if new_name or new_email or new_nick is not None:
                final_name = new_name if new_name else user[1]
                final_email = new_email if new_email else user[2]
                atualizar_usuario_basico(user_id, final_name, final_email, new_nick)
                session['user_name'] = final_name
                session['user_email'] = final_email
                session['user_nick'] = new_nick or final_name
                flash("Perfil atualizado com sucesso.", "success")
        except Exception as e:
            msg = str(e)
            if "UNIQUE" in msg.upper():
                flash("Este email já está em uso por outra conta.", "danger")
            else:
                flash("Não foi possível salvar os dados básicos.", "danger")

        avatar_file = request.files.get("avatar_file")
        if avatar_file and avatar_file.filename:
            if not _ext_ok(avatar_file.filename, ALLOWED_IMAGE_EXTS):
                flash("Avatar inválido. Envie PNG/JPG/JPEG/WEBP.", "warning")
            else:
                new_avatar_rel = _save_avatar(avatar_file, user_id)
                if new_avatar_rel:
                    atualizar_avatar_usuario(user_id, new_avatar_rel)
                    session['user_avatar'] = new_avatar_rel
                    flash("Foto de perfil atualizada.", "success")

        cur_pwd = request.form.get("current_password") or ""
        new_pwd = request.form.get("new_password") or ""
        conf_pwd = request.form.get("confirm_password") or ""

        if any([cur_pwd, new_pwd, conf_pwd]):
            if not (cur_pwd and new_pwd and conf_pwd):
                flash("Para trocar a senha, preencha todos os campos de senha.", "warning")
            elif new_pwd != conf_pwd:
                flash("A nova senha e a confirmação não correspondem.", "warning")
            elif not check_password_hash(user[3], cur_pwd):
                flash("Senha atual incorreta.", "danger")
            elif len(new_pwd) < 6:
                flash("A nova senha deve ter pelo menos 6 caracteres.", "warning")
            else:
                atualizar_senha_usuario(user_id, new_pwd)
                flash("Senha alterada com sucesso.", "success")

        user = buscar_usuario_por_id(user_id)

    return render_template("perfilConfiguracoes.html", user=user)


@app.route("/perfil/dev-solicitar", methods=["POST"])
@login_required
def dev_solicitar():
    reason = (request.form.get("dev_reason") or "").strip()
    if len(reason) < 10:
        flash("Conte um pouco melhor seu motivo (mín. 10 caracteres).", "warning")
        return redirect(url_for("perfilConfig"))
    import sqlite3
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO solicitacoes_dev (user_id, reason, status)
            VALUES (?, ?, 'pending')
            """,
            (session['user_id'], reason),
        )
    flash("Solicitação enviada! Aguarde análise do administrador.", "success")
    return redirect(url_for("perfilConfig"))


@app.route("/jogar/<slug>")
@login_required
def play_build(slug):
    b = buscar_build_por_slug(slug)
    if not b:
        abort(404)
    abs_dir = _build_abs_dir(b["build_path"])
    if not os.path.isdir(abs_dir):
        abort(404)
    index_path = os.path.join(abs_dir, "index.html")
    if not os.path.isfile(index_path):
        abort(404)

    rel_from_static = os.path.relpath(index_path, STATIC_DIR).replace("\\", "/")
    direct_url = url_for("static", filename=rel_from_static)

    return render_template(
        "play_unity.html",
        title=b["title"],
        direct_url=direct_url,
        back_url=url_for("loja"),
        note="Dica: use Tela Cheia para melhor experiência.",
        is_admin_preview=False,
    )


@app.route("/admin/testar-build/<slug>")
@admin_required
def admin_testar_build(slug):
    import sqlite3 as _sqlite3

    with _sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = _dict_factory
        row = conn.execute(
            """
            SELECT j.id,
                   j.titulo,
                   j.descricao,
                   j.capa_url,
                   j.trailer_url,
                   j.categoria,
                   j.preco,
                   b.build_path,
                   COALESCE(u.nickname, u.nome) AS dev_name
              FROM jogos j
              JOIN builds b ON b.slug = j.build_slug
              LEFT JOIN usuarios u ON u.id = b.created_by
             WHERE b.slug = ?
            """,
            (slug,),
        ).fetchone()

    if not row:
        abort(404)

    abs_dir = _build_abs_dir(row["build_path"])
    if not os.path.isdir(abs_dir):
        abort(404)

    index_path = os.path.join(abs_dir, "index.html")
    if not os.path.isfile(index_path):
        abort(404)

    rel_from_static = os.path.relpath(index_path, STATIC_DIR).replace("\\", "/")
    direct_url = url_for("static", filename=rel_from_static)

    capa_url = _public_url(row["capa_url"])
    trailer_url = _public_url(row["trailer_url"]) if row["trailer_url"] else None

    return render_template(
        "admin_play_build.html",
        title=row["titulo"],
        direct_url=direct_url,
        back_url=url_for("admin_publicar_jogos"),
        note="Você está testando o jogo como ADMIN antes de publicar na loja.",
        capa_url=capa_url,
        trailer_url=trailer_url,
        dev_name=row["dev_name"],
        categoria=row["categoria"],
        preco=row["preco"],
        descricao=row["descricao"],
        slug=slug,
    )


@app.route("/admin/download-build/<slug>")
@admin_required
def admin_download_build(slug):
    b = buscar_build_por_slug(slug)
    if not b:
        abort(404)

    abs_dir = _build_abs_dir(b["build_path"])
    if not os.path.isdir(abs_dir):
        abort(404)

    tmp_dir = os.path.join(BASE_DIR, "tmp_admin_zips")
    os.makedirs(tmp_dir, exist_ok=True)
    zip_filename = f"{b['slug']}.zip"
    zip_path = os.path.join(tmp_dir, zip_filename)

    if os.path.exists(zip_path):
        os.remove(zip_path)

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(abs_dir):
            for f in files:
                file_path = os.path.join(root, f)
                arcname = os.path.relpath(file_path, abs_dir)
                zf.write(file_path, arcname)

    return send_file(zip_path, as_attachment=True, download_name=zip_filename)


@app.route("/dev/upload", methods=["GET"])
@dev_required
def dev_upload():
    return render_template("upload.html")


@app.route("/dev/upload", methods=["POST"])
@dev_required
def dev_upload_post():
    from db import jogo_existe_por_titulo, slug_existe, buscar_build_por_slug, deletar_build_por_slug

    title = (request.form.get("title") or "").strip()
    preco_str = (request.form.get("price") or "0").strip().replace(",", ".")
    categoria = (request.form.get("category") or "Outros").strip()
    descricao = (request.form.get("description") or "").strip()

    file_zip = request.files.get("file")
    cover_file = request.files.get("cover_file")
    trailer_file = request.files.get("trailer_file")

    gallery_images = request.files.getlist("gallery_images")
    gallery_videos = request.files.getlist("gallery_videos")

    try:
        preco = float(preco_str)
    except ValueError:
        preco = -1

    if len(title) < 3 or len(title) > 80:
        flash("O título deve ter entre 3 e 80 caracteres.", "warning")
        return redirect(url_for("dev_upload"))

    if preco < 0:
        flash("Preço inválido. Use um valor maior ou igual a 0.", "warning")
        return redirect(url_for("dev_upload"))

    if categoria not in VALID_CATEGORIES:
        flash("Categoria inválida.", "warning")
        return redirect(url_for("dev_upload"))

    if not title or not file_zip or not cover_file:
        flash("Preencha o título, envie a CAPA (imagem) e o .zip do build.", "danger")
        return redirect(url_for("dev_upload"))

    if not _ext_ok(cover_file.filename, ALLOWED_IMAGE_EXTS):
        flash("Capa inválida. Envie PNG/JPG/JPEG/WEBP.", "warning")
        return redirect(url_for("dev_upload"))

    if not _ext_ok(file_zip.filename, ALLOWED_ZIP_EXTS):
        flash("Arquivo de build inválido. Envie um .zip.", "warning")
        return redirect(url_for("dev_upload"))

    if trailer_file and trailer_file.filename:
        if not _ext_ok(trailer_file.filename, ALLOWED_VIDEO_EXTS):
            flash("Trailer inválido. Envie MP4/WEBM/MOV.", "warning")
            return redirect(url_for("dev_upload"))

    if jogo_existe_por_titulo(title):
        flash("Já existe um jogo com esse título. Escolha outro nome.", "danger")
        return redirect(url_for("dev_upload"))

    build_id = str(uuid.uuid4())
    dest_dir = os.path.join(GAMES_ROOT, build_id)
    os.makedirs(dest_dir, exist_ok=True)

    cover_name = secure_filename(cover_file.filename)
    cover_path = os.path.join(dest_dir, cover_name)
    if not _img_wh_is_1920x1080(cover_file):
        flash("Capa deve ser 1920x1080.", "warning")
        return redirect(url_for("dev_upload"))
    cover_file.save(cover_path)
    capa_relativa = os.path.relpath(cover_path, BASE_DIR).replace("\\", "/")

    trailer_relativa = None
    if trailer_file and trailer_file.filename:
        trailer_name = secure_filename(trailer_file.filename)
        trailer_path = os.path.join(dest_dir, trailer_name)
        trailer_file.save(trailer_path)
        trailer_relativa = os.path.relpath(trailer_path, BASE_DIR).replace("\\", "/")

    zip_name = secure_filename(file_zip.filename) or f"{build_id}.zip"
    zip_path = os.path.join(dest_dir, zip_name)
    file_zip.save(zip_path)

    try:
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(dest_dir)
    except zipfile.BadZipFile:
        shutil.rmtree(dest_dir, ignore_errors=True)
        flash("ZIP inválido/corrompido.", "danger")
        return redirect(url_for("dev_upload"))
    finally:
        try:
            os.remove(zip_path)
        except FileNotFoundError:
            pass

    index_html = os.path.join(dest_dir, "index.html")
    if not os.path.isfile(index_html):
        found_html = _find_any_html(dest_dir)
        if not found_html:
            shutil.rmtree(dest_dir, ignore_errors=True)
            flash("Nenhum arquivo HTML de entrada foi encontrado no ZIP.", "danger")
            return redirect(url_for("dev_upload"))

        found_root = os.path.dirname(found_html)
        if os.path.abspath(found_root) != os.path.abspath(dest_dir):
            for name in os.listdir(found_root):
                shutil.move(os.path.join(found_root, name), os.path.join(dest_dir, name))
            shutil.rmtree(found_root, ignore_errors=True)

        orig = os.path.join(dest_dir, os.path.basename(found_html))
        if os.path.abspath(orig) != os.path.abspath(index_html):
            try:
                os.replace(orig, index_html)
            except Exception:
                shutil.copy2(orig, index_html)
                os.remove(orig)

    is_unity = True if os.path.isdir(os.path.join(dest_dir, "Build")) else False
    is_unreal = False
    for root, _, files in os.walk(dest_dir):
        for f in files:
            lo = f.lower()
            if lo.endswith(".wasm"):
                is_unreal = True
            if lo.endswith(".js"):
                is_unreal = is_unreal or True

    if not (is_unity or is_unreal):
        shutil.rmtree(dest_dir, ignore_errors=True)
        flash("Estrutura inválida (Unity Build/ ou Unreal HTML5 .wasm/.js).", "danger")
        return redirect(url_for("dev_upload"))

    slug = slugify(title)
    if buscar_build_por_slug(slug):
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    try:
        registrar_build(
            title,
            slug,
            f"static/games/{build_id}/",
            session['user_id'],
            visibility="pending",
        )

        jogo_id = criar_jogo_por_build(
            titulo=title,
            preco=preco,
            capa_url=capa_relativa,
            categoria=categoria,
            descricao=descricao,
            trailer_url=trailer_relativa,
            build_slug=slug,
        )

        # 🔒 deixa o jogo OCULTO da loja/home até o admin aprovar
        set_jogo_delisted(jogo_id, True)

    except Exception as e:
        try:
            if "slug" in locals() and slug:
                deletar_build_por_slug(slug)
        except Exception:
            pass

        shutil.rmtree(dest_dir, ignore_errors=True)

        msg = str(e)
        if "ux_jogos_titulo_nocase" in msg or "UNIQUE" in msg.upper():
            flash("Já existe um jogo com esse título.", "danger")
        else:
            flash("Erro ao criar o jogo. Tente novamente.", "danger")
        return redirect(url_for("dev_upload"))

    midias = []
    ord_idx = 0

    for img in (gallery_images or []):
        if not img or not img.filename:
            continue
        if not _ext_ok(img.filename, ALLOWED_IMAGE_EXTS):
            flash(f"Imagem ignorada: {img.filename} (tipo inválido).", "warning")
            continue
        if not _img_wh_is_1920x1080(img):
            flash(f"Imagem {img.filename} não é 1920x1080 (ignorada).", "warning")
            continue
        name = secure_filename(img.filename)
        pth = os.path.join(dest_dir, name)
        img.save(pth)
        rel = os.path.relpath(pth, BASE_DIR).replace("\\", "/")
        midias.append({"tipo": "image", "url": rel, "w": 1920, "h": 1080, "ord": ord_idx})
        ord_idx += 1

    for vd in (gallery_videos or []):
        if not vd or not vd.filename:
            continue
        if not _ext_ok(vd.filename, ALLOWED_VIDEO_EXTS):
            flash(f"Vídeo ignorado: {vd.filename} (tipo inválido).", "warning")
            continue
        name = secure_filename(vd.filename)
        pth = os.path.join(dest_dir, name)
        vd.save(pth)
        rel = os.path.relpath(pth, BASE_DIR).replace("\\", "/")
        midias.append({"tipo": "video", "url": rel, "w": None, "h": None, "ord": ord_idx})
        ord_idx += 1

    if midias:
        inserir_midias(jogo_id, midias)

    dev_email = session.get("user_email")
    dev_name = session.get("user_nick") or session.get("user_name") or "Desenvolvedor(a)"
    if dev_email:
        send_email(
            dev_email,
            "Cronos - Jogo enviado para avaliação",
            (
                f"Olá, {dev_name}!\n\n"
                f"Recebemos o envio do seu jogo '{title}'. Nossa equipe irá analisar os arquivos "
                "e, se estiver tudo certo, ele será publicado na loja em até 7 dias úteis.\n\n"
                "Você receberá um novo e-mail assim que a publicação for concluída.\n\n"
                "Atenciosamente,\nEquipe Cronos"
            ),
        )

    flash("Build enviado! Seu jogo entrou na fila de avaliação do administrador.", "success")
    return redirect(url_for("loja"))


@app.route("/suporte", methods=["GET"])
@login_required
def suporte():
    user_id = session['user_id']
    tickets = listar_tickets_usuario(user_id)
    user_name = session.get("user_nick") or session.get("user_name")
    user_email = session.get("user_email")
    return render_template("suporte.html", tickets=tickets, user_name=user_name, user_email=user_email)


@app.route("/api/suporte/tickets", methods=["GET"])
@login_required
def api_suporte_list_tickets():
    user_id = session['user_id']
    tickets = listar_tickets_usuario(user_id)
    return jsonify(tickets)


@app.route("/api/suporte/tickets", methods=["POST"])
@login_required
def api_suporte_create_ticket():
    data = request.get_json() or {}
    categoria = (data.get("categoria") or "").strip()
    assunto = (data.get("assunto") or "").strip()
    mensagem = (data.get("mensagem") or "").strip()
    if not mensagem:
        return jsonify({"ok": False, "error": "mensagem_obrigatoria"}), 400
    user_id = session['user_id']
    nome = session.get("user_nick") or session.get("user_name")
    email = session.get("user_email")
    ticket_id = criar_ticket_suporte(user_id, nome, email, categoria, assunto, mensagem)
    ticket = obter_ticket(ticket_id, usuario_id=user_id)
    return jsonify({"ok": True, "ticket": ticket})


@app.route("/api/suporte/tickets/<int:ticket_id>/mensagens", methods=["GET", "POST"])
@login_required
def api_suporte_ticket_mensagens(ticket_id):
    user_id = session['user_id']
    ticket = obter_ticket(ticket_id, usuario_id=user_id)
    if not ticket:
        return jsonify({"error": "not_found"}), 404
    if request.method == "GET":
        msgs = listar_mensagens_ticket(ticket_id)
        return jsonify(msgs)
    data = request.get_json() or {}
    mensagem = (data.get("mensagem") or "").strip()
    if not mensagem:
        return jsonify({"error": "mensagem_obrigatoria"}), 400
    adicionar_mensagem_ticket(ticket_id, user_id, False, mensagem)
    msgs = listar_mensagens_ticket(ticket_id)
    return jsonify({"ok": True, "mensagens": msgs})


@app.route("/admin")
@admin_required
def admin_index():
    import sqlite3 as _sqlite3

    # Dev requests pendentes
    with _sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = _dict_factory
        row = conn.execute(
            "SELECT COUNT(*) AS c FROM solicitacoes_dev WHERE status='pending'"
        ).fetchone()
        pend_dev = row["c"] if row else 0

    pend_games = len(listar_jogos_pendentes_para_aprovar())
    total_users = len(listar_usuarios())
    total_games = len(listar_todos_jogos_admin())

    return render_template(
        "admin_index.html",
        pend_dev=pend_dev,
        pend_games=pend_games,
        total_users=total_users,
        total_games=total_games,
    )


@app.route("/admin/dev-requests", methods=["GET", "POST"])
@admin_required
def admin_dev_requests():
    import sqlite3
    if request.method == "POST":
        rid = int(request.form.get("req_id") or 0)
        action = request.form.get("action")
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = _dict_factory
            req = conn.execute(
                "SELECT * FROM solicitacoes_dev WHERE id=?", (rid,)
            ).fetchone()
            if not req:
                flash("Solicitação não encontrada", "danger")
            else:
                if action == "approve":
                    conn.execute(
                        """
                        UPDATE solicitacoes_dev
                           SET status='approved',
                               decided_at=datetime('now'),
                               decided_by=?
                         WHERE id=?
                        """,
                        (session['user_id'], rid),
                    )
                    atualizar_role_usuario(req["user_id"], "dev")
                    flash("Aprovado. Usuário agora é dev.", "success")
                elif action == "reject":
                    conn.execute(
                        """
                        UPDATE solicitacoes_dev
                           SET status='rejected',
                               decided_at=datetime('now'),
                               decided_by=?
                         WHERE id=?
                        """,
                        (session['user_id'], rid),
                    )
                    flash("Recusado.", "info")

    import sqlite3 as _sqlite3
    with _sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = _dict_factory
        pending = conn.execute(
            """
            SELECT sd.*, u.id as uid, u.nome, u.email
              FROM solicitacoes_dev sd
              JOIN usuarios u ON u.id = sd.user_id
             WHERE sd.status='pending'
             ORDER BY sd.created_at
            """
        ).fetchall()

    return render_template("admin_dev_requests.html", pending=pending)


@app.route("/admin/publicar-jogos", methods=["GET", "POST"])
@admin_required
def admin_publicar_jogos():
    if request.method == "POST":
        jid = int(request.form.get("jogo_id") or 0)
        action = (request.form.get("action") or "").strip()

        import sqlite3 as _sqlite3
        with _sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = _dict_factory
            row = conn.execute(
                """
                SELECT j.id, j.titulo, j.build_slug,
                       u.email AS dev_email,
                       COALESCE(u.nickname, u.nome) AS dev_name
                  FROM jogos j
                  JOIN builds b ON b.slug = j.build_slug
                  LEFT JOIN usuarios u ON u.id = b.created_by
                 WHERE j.id = ?
                """,
                (jid,),
            ).fetchone()

        if not row:
            flash("Jogo não encontrado.", "danger")
        else:
            if action == "approve":
                atualizar_build_visibility_by_slug(row["build_slug"], "public")
                set_jogo_delisted(jid, False)
                flash(f"Jogo '{row['titulo']}' publicado na loja.", "success")

                if row.get("dev_email"):
                    send_email(
                        row["dev_email"],
                        "Cronos - Seu jogo foi publicado",
                        (
                            f"Olá, {row.get('dev_name') or 'desenvolvedor(a)'}!\n\n"
                            f"Seu jogo '{row['titulo']}' foi analisado e acaba de ser publicado na loja Cronos.\n\n"
                            "Obrigado por desenvolver com a gente!\n\n"
                            "Equipe Cronos"
                        ),
                    )

            elif action == "reject":
                atualizar_build_visibility_by_slug(row["build_slug"], "rejected")
                set_jogo_delisted(jid, True)
                flash(f"Jogo '{row['titulo']}' marcado como rejeitado.", "info")

                if row.get("dev_email"):
                    send_email(
                        row["dev_email"],
                        "Cronos - Seu jogo não foi aprovado",
                        (
                            f"Olá, {row.get('dev_name') or 'desenvolvedor(a)'}!\n\n"
                            f"Seu jogo '{row['titulo']}' foi analisado e, no momento, não pôde ser publicado na loja.\n"
                            "Caso queira, entre em contato com o suporte para entender os motivos e reenviar o build.\n\n"
                            "Equipe Cronos"
                        ),
                    )

    pendentes = listar_jogos_pendentes_para_aprovar()
    return render_template("admin_publicar_jogos.html", pendentes=pendentes)


@app.route("/admin/usuarios", methods=["GET", "POST"])
@admin_required
def admin_usuarios():
    if request.method == "POST":
        uid = int(request.form.get("user_id"))
        action = request.form.get("action")
        if action == "ban":
            set_user_ban(uid, True)
        elif action == "unban":
            set_user_ban(uid, False)

    users = listar_usuarios()
    return render_template("admin_usuarios.html", users=users)


@app.route("/admin/api/jogos/<int:jogo_id>/delete", methods=["POST"])
@admin_required
def admin_api_delete_jogo(jogo_id):
    deletar_jogo_definitivo(jogo_id)
    return jsonify({"ok": True})


@app.route("/admin/jogos", methods=["GET", "POST"])
@admin_required
def admin_jogos():
    if request.method == "POST":
        jid = int(request.form.get("jogo_id"))
        action = request.form.get("action")
        if action == "delist":
            set_jogo_delisted(jid, True)
        elif action == "restore":
            set_jogo_delisted(jid, False)
        elif action == "delete":
            deletar_jogo_definitivo(jid)

    jogos = listar_todos_jogos_admin()
    return render_template("admin_jogos.html", jogos=jogos)


if __name__ == "__main__":
    app.run(debug=True)
