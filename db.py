import os
import sqlite3
from werkzeug.security import generate_password_hash

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "loja_jogos.db")

# caminho relativo à pasta static/
DEFAULT_AVATAR = "static/uploads/avatars/default-avatar.png"


def _dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d


def _has_column(conn, table, column):
    cur = conn.execute(f"PRAGMA table_info({table});")
    return any(r[1] == column for r in cur.fetchall())


def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON;")

        # --> usuários
        conn.execute("""
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                senha TEXT NOT NULL
            );
        """)

        if not _has_column(conn, "usuarios", "nickname"):
            conn.execute("ALTER TABLE usuarios ADD COLUMN nickname TEXT;")

        if not _has_column(conn, "usuarios", "role"):
            conn.execute("ALTER TABLE usuarios ADD COLUMN role TEXT DEFAULT 'user';")
            conn.execute("UPDATE usuarios SET role = 'user' WHERE role IS NULL;")

        if not _has_column(conn, "usuarios", "avatar_url"):
            conn.execute("ALTER TABLE usuarios ADD COLUMN avatar_url TEXT;")

        # garante que todo mundo que estiver vazio receba o avatar default
        conn.execute("""
            UPDATE usuarios
               SET avatar_url = ?
             WHERE avatar_url IS NULL
                OR TRIM(avatar_url) = ''
        """, (DEFAULT_AVATAR,))

        if not _has_column(conn, "usuarios", "is_banned"):
            conn.execute("ALTER TABLE usuarios ADD COLUMN is_banned INTEGER DEFAULT 0;")

        # --> jogos
        conn.execute("""
            CREATE TABLE IF NOT EXISTS jogos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo TEXT NOT NULL,
                preco REAL NOT NULL,
                capa_url TEXT NOT NULL,
                categoria TEXT NOT NULL
            );
        """)
        conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS ux_jogos_titulo_nocase
            ON jogos (titulo COLLATE NOCASE);
        """)
        if not _has_column(conn, "jogos", "descricao"):
            conn.execute("ALTER TABLE jogos ADD COLUMN descricao TEXT;")
        if not _has_column(conn, "jogos", "trailer_url"):
            conn.execute("ALTER TABLE jogos ADD COLUMN trailer_url TEXT;")
        if not _has_column(conn, "jogos", "build_slug"):
            conn.execute("ALTER TABLE jogos ADD COLUMN build_slug TEXT;")
        if not _has_column(conn, "jogos", "delisted"):
            conn.execute("ALTER TABLE jogos ADD COLUMN delisted INTEGER DEFAULT 0;")

        # --> compras
        conn.execute("""
            CREATE TABLE IF NOT EXISTS compras (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL,
                jogo_id INTEGER NOT NULL,
                comprado_em TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(usuario_id, jogo_id),
                FOREIGN KEY(usuario_id) REFERENCES usuarios(id),
                FOREIGN KEY(jogo_id) REFERENCES jogos(id)
            );
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS builds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                build_path TEXT NOT NULL,
                visibility TEXT NOT NULL DEFAULT 'private',
                created_by INTEGER NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(created_by) REFERENCES usuarios(id)
            );
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS jogo_midias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                jogo_id INTEGER NOT NULL,
                tipo TEXT NOT NULL,
                url TEXT NOT NULL,
                w INTEGER,
                h INTEGER,
                ord INTEGER DEFAULT 0,
                FOREIGN KEY(jogo_id) REFERENCES jogos(id) ON DELETE CASCADE
            );
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS reembolsos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                compra_id INTEGER,
                usuario_id INTEGER NOT NULL,
                jogo_id INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'aprovado',
                criado_em TEXT DEFAULT CURRENT_TIMESTAMP
            );
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS solicitacoes_dev (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                reason TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                decided_at TEXT,
                decided_by INTEGER
            );
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS solicitacoes_remocao (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                jogo_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                reason TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                decided_at TEXT,
                decided_by INTEGER
            );
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS suporte_tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL,
                nome TEXT,
                email TEXT,
                categoria TEXT,
                assunto TEXT,
                status TEXT NOT NULL DEFAULT 'aberto',
                prioridade TEXT,
                criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
                atualizado_em TEXT,
                FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
            );
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS suporte_mensagens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                autor_id INTEGER,
                is_staff INTEGER NOT NULL DEFAULT 0,
                mensagem TEXT NOT NULL,
                criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(ticket_id) REFERENCES suporte_tickets(id) ON DELETE CASCADE,
                FOREIGN KEY(autor_id) REFERENCES usuarios(id)
            );
        """)

        cur = conn.execute("SELECT COUNT(*) FROM jogos")
        # (qtd,) = cur.fetchone()
        # if qtd == 0:
        #     jogos_seed = [...]
        #     conn.executemany(...)

        # usuário dev padrão
        cur = conn.execute("SELECT id FROM usuarios WHERE email = ?", ("dev@cronos.local",))
        if cur.fetchone() is None:
            conn.execute(
                """
                INSERT INTO usuarios (nome, email, senha, nickname, role, avatar_url)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                ("Dev Cronos",
                 "dev@cronos.local",
                 generate_password_hash("dev123"),
                 "Dev",
                 "dev",
                 DEFAULT_AVATAR)
            )

        # usuário admin padrão
        cur = conn.execute("SELECT id FROM usuarios WHERE email = ?", ("admin@cronos.local",))
        if cur.fetchone() is None:
            conn.execute(
                """
                INSERT INTO usuarios (nome, email, senha, nickname, role, avatar_url)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                ("Admin Cronos",
                 "admin@cronos.local",
                 generate_password_hash("admin123"),
                 "Admin",
                 "admin",
                 DEFAULT_AVATAR)
            )


def listar_usuarios():
    with sqlite3.connect(DB_PATH) as conn:
        return conn.execute("SELECT id, nome, email, nickname, role, is_banned FROM usuarios").fetchall()


def cadastrar_usuario(nome, email, senha, nickname=None, role="user"):
    senha_hash = generate_password_hash(senha)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO usuarios (nome, email, senha, nickname, role, avatar_url)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (nome, email, senha_hash, nickname, role, DEFAULT_AVATAR)
        )


def buscar_usuario_por_email(email):
    with sqlite3.connect(DB_PATH) as conn:
        return conn.execute(
            "SELECT id, nome, email, senha, nickname, role, avatar_url FROM usuarios WHERE email = ?",
            (email,)
        ).fetchone()


def buscar_usuario_por_id(user_id: int):
    with sqlite3.connect(DB_PATH) as conn:
        return conn.execute(
            "SELECT id, nome, email, senha, nickname, role, avatar_url FROM usuarios WHERE id = ?",
            (user_id,)
        ).fetchone()


def atualizar_usuario_basico(user_id: int, nome: str, email: str, nickname: str | None):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "UPDATE usuarios SET nome = ?, email = ?, nickname = ? WHERE id = ?",
            (nome, email, nickname, user_id)
        )


def atualizar_avatar_usuario(user_id: int, avatar_url: str):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "UPDATE usuarios SET avatar_url = ? WHERE id = ?",
            (avatar_url, user_id)
        )


def atualizar_senha_usuario(user_id, nova_senha):
    senha_hash = generate_password_hash(nova_senha)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("UPDATE usuarios SET senha = ? WHERE id = ?", (senha_hash, user_id))


def atualizar_role_usuario(user_id, nova_role):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("UPDATE usuarios SET role = ? WHERE id = ?", (nova_role, user_id))


def set_user_ban(user_id: int, banned: bool):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("UPDATE usuarios SET is_banned = ? WHERE id = ?", (1 if banned else 0, user_id))


def listar_jogos(incluir_delisted=False):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = _dict_factory
        if not incluir_delisted:
            sql = """
                SELECT j.*
                    FROM jogos j
                    LEFT JOIN builds b ON b.slug = j.build_slug
                WHERE j.delisted = 0
                    AND (b.visibility IS NULL OR b.visibility IN ('public', 'private'))
                ORDER BY j.id DESC
            """
            return conn.execute(sql).fetchall()
        return conn.execute("SELECT * FROM jogos ORDER BY id DESC").fetchall()


def listar_todos_jogos_admin():
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = _dict_factory
        return conn.execute("SELECT * FROM jogos ORDER BY id DESC").fetchall()


def set_jogo_delisted(jogo_id: int, val: bool):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("UPDATE jogos SET delisted = ? WHERE id = ?", (1 if val else 0, jogo_id))


def deletar_jogo_definitivo(jogo_id: int):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM jogos WHERE id = ?", (jogo_id,))


def inserir_midias(jogo_id: int, midias: list[dict]):
    if not midias:
        return
    with sqlite3.connect(DB_PATH) as conn:
        conn.executemany("""
            INSERT INTO jogo_midias (jogo_id, tipo, url, w, h, ord)
            VALUES (?, ?, ?, ?, ?, ?)
        """, [(jogo_id, m.get("tipo"), m.get("url"), m.get("w"), m.get("h"), m.get("ord", 0)) for m in midias])


def listar_midias_por_jogos(ids: list[int]):
    if not ids:
        return {}
    qmarks = ",".join("?" for _ in ids)
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = _dict_factory
        rows = conn.execute(f"""
            SELECT * FROM jogo_midias
            WHERE jogo_id IN ({qmarks})
            ORDER BY jogo_id, ord, id
        """, ids).fetchall()
    out = {}
    for r in rows:
        out.setdefault(r["jogo_id"], []).append(r)
    return out


def jogos_do_usuario(usuario_id):
    with sqlite3.connect(DB_PATH) as conn:
        return [row[0] for row in conn.execute(
            "SELECT jogo_id FROM compras WHERE usuario_id = ?",
            (usuario_id,)
        ).fetchall()]


def compras_detalhadas_do_usuario(usuario_id):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = _dict_factory
        return conn.execute("""
            SELECT c.*, j.titulo, j.capa_url
            FROM compras c
            JOIN jogos j ON j.id = c.jogo_id
            WHERE c.usuario_id = ?
            ORDER BY c.comprado_em DESC
        """, (usuario_id,)).fetchall()


def obter_compra(usuario_id, jogo_id):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = _dict_factory
        return conn.execute("""
            SELECT * FROM compras WHERE usuario_id = ? AND jogo_id = ?
        """, (usuario_id, jogo_id)).fetchone()


def comprar_jogo(usuario_id, jogo_id):
    with sqlite3.connect(DB_PATH) as conn:
        try:
            conn.execute("PRAGMA foreign_keys = ON;")
            conn.execute(
                "INSERT INTO compras (usuario_id, jogo_id) VALUES (?, ?)",
                (usuario_id, jogo_id)
            )
            return True, None
        except sqlite3.IntegrityError as e:
            return False, str(e)


def deletar_compra(compra_id: int):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM compras WHERE id = ?", (compra_id,))


def registrar_reembolso(usuario_id, jogo_id, compra_id):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            INSERT INTO reembolsos (usuario_id, jogo_id, compra_id, status)
            VALUES (?, ?, ?, 'aprovado')
        """, (usuario_id, jogo_id, compra_id))


def registrar_build(title, slug, build_path, created_by, visibility="private"):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO builds (title, slug, build_path, created_by, visibility) VALUES (?,?,?,?,?)",
            (title, slug, build_path, created_by, visibility)
        )


def listar_builds():
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = _dict_factory
        return conn.execute(
            "SELECT id, title, slug, build_path, visibility, created_by, created_at FROM builds ORDER BY created_at DESC"
        ).fetchall()


def buscar_build_por_slug(slug):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = _dict_factory
        return conn.execute(
            "SELECT id, title, slug, build_path, visibility, created_by FROM builds WHERE slug=?",
            (slug,)
        ).fetchone()


def criar_jogo_por_build(titulo, preco, capa_url, categoria, descricao, trailer_url, build_slug) -> int:
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute("""
            INSERT INTO jogos (titulo, preco, capa_url, categoria, descricao, trailer_url, build_slug)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (titulo, preco, capa_url, categoria, descricao, trailer_url, build_slug))
        return cur.lastrowid


def jogo_existe_por_titulo(titulo: str) -> bool:
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute(
            "SELECT 1 FROM jogos WHERE titulo = ? COLLATE NOCASE LIMIT 1",
            (titulo,)
        )
        return cur.fetchone() is not None


def slug_existe(slug: str) -> bool:
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute("SELECT 1 FROM builds WHERE slug = ? LIMIT 1", (slug,))
        return cur.fetchone() is not None


def deletar_build_por_slug(slug: str):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM builds WHERE slug = ?", (slug,))


def listar_jogos_pendentes_para_aprovar():
    """
    Jogos cujo build está com visibility='pending' (fila de publicação).
    """
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = _dict_factory
        return conn.execute("""
            SELECT 
                j.*,
                b.id        AS build_id,
                b.slug      AS build_slug,
                b.build_path,
                b.visibility,
                b.created_at,
                u.id        AS dev_id,
                COALESCE(u.nickname, u.nome) AS dev_name,
                u.email     AS dev_email
            FROM jogos j
            JOIN builds b ON b.slug = j.build_slug
            LEFT JOIN usuarios u ON u.id = b.created_by
            WHERE b.visibility = 'pending'
            ORDER BY b.created_at ASC, j.id ASC
        """).fetchall()


def atualizar_build_visibility_by_slug(slug: str, visibility: str):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "UPDATE builds SET visibility = ? WHERE slug = ?",
            (visibility, slug)
        )


def listar_jogos_recentes(limit=8):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = _dict_factory
        sql = """
        SELECT j.*, b.created_at,
               u.id AS dev_id, COALESCE(u.nickname, u.nome) AS dev_nick, u.avatar_url AS dev_avatar
          FROM jogos j
          JOIN builds b ON b.slug = j.build_slug
          LEFT JOIN usuarios u ON u.id = b.created_by
         WHERE j.delisted = 0
           AND (b.visibility IS NULL OR b.visibility IN ('public', 'private'))
         ORDER BY b.created_at DESC
         LIMIT ?
        """
        return conn.execute(sql, (limit,)).fetchall()


def listar_em_alta(limit=8):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = _dict_factory
        sql = """
        SELECT j.*, COUNT(c.id) AS vendas_30d
          FROM jogos j
          LEFT JOIN compras c
                 ON c.jogo_id = j.id
                AND c.comprado_em >= datetime('now', '-30 day')
         WHERE j.delisted = 0
         GROUP BY j.id
         ORDER BY vendas_30d DESC, j.id DESC
         LIMIT ?
        """
        return conn.execute(sql, (limit,)).fetchall()


def listar_descobertas(limit=12):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = _dict_factory
        sql = """
        SELECT
          u.id AS dev_id,
          COALESCE(u.nickname, u.nome) AS dev_name,
          u.avatar_url AS dev_avatar,
          b.title AS build_title, b.slug AS build_slug, b.created_at,
          j.id, j.titulo, j.preco, j.capa_url, j.categoria, j.descricao, j.trailer_url, j.build_slug
        FROM builds b
        JOIN usuarios u ON u.id = b.created_by
        JOIN jogos j ON j.build_slug = b.slug
        WHERE j.delisted = 0
          AND (b.visibility IS NULL OR b.visibility IN ('public', 'private'))
        ORDER BY b.created_at DESC
        LIMIT ?
        """
        return conn.execute(sql, (limit,)).fetchall()


def listar_spotlight_dev():
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = _dict_factory
        sql = """
        SELECT 
          u.id AS dev_id,
          COALESCE(u.nickname,u.nome) AS dev_name,
          u.avatar_url AS dev_avatar,
          b.title, b.slug, b.created_at,
          j.id AS jogo_id, j.titulo, j.capa_url, j.preco, j.categoria, j.descricao, j.trailer_url, j.build_slug
        FROM builds b
        JOIN usuarios u ON u.id = b.created_by
        LEFT JOIN jogos j ON j.build_slug = b.slug
        WHERE (j.delisted = 0 OR j.delisted IS NULL)
          AND (b.visibility IS NULL OR b.visibility IN ('public', 'private'))
        ORDER BY b.created_at DESC
        LIMIT 1
        """
        return conn.execute(sql).fetchone()


def jogos_na_biblioteca(usuario_id):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = _dict_factory
        return conn.execute("""
            SELECT
                j.id as id,
                j.titulo as titulo,
                j.capa_url as capa_url,
                j.categoria as categoria,
                j.build_slug as build_slug,
                c.comprado_em as comprado_em
            FROM compras c
            JOIN jogos j ON j.id = c.jogo_id
            WHERE c.usuario_id = ?
            ORDER BY c.comprado_em DESC
        """, (usuario_id,)).fetchall()


def criar_ticket_suporte(usuario_id: int, nome: str, email: str,
                         categoria: str | None, assunto: str | None,
                         mensagem_inicial: str) -> int:
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute("""
            INSERT INTO suporte_tickets (usuario_id, nome, email, categoria, assunto, status, criado_em)
            VALUES (?, ?, ?, ?, ?, 'aberto', datetime('now'))
        """, (usuario_id, nome, email, categoria, assunto))
        ticket_id = cur.lastrowid
        conn.execute("""
            INSERT INTO suporte_mensagens (ticket_id, autor_id, is_staff, mensagem, criado_em)
            VALUES (?, ?, 0, ?, datetime('now'))
        """, (ticket_id, usuario_id, mensagem_inicial))
        conn.execute("""
            UPDATE suporte_tickets
               SET atualizado_em = datetime('now')
             WHERE id = ?
        """, (ticket_id,))
        return ticket_id


def listar_tickets_usuario(usuario_id: int):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = _dict_factory
        return conn.execute("""
            SELECT id, categoria, assunto, status, criado_em, atualizado_em
              FROM suporte_tickets
             WHERE usuario_id = ?
             ORDER BY COALESCE(atualizado_em, criado_em) DESC, id DESC
        """, (usuario_id,)).fetchall()


def obter_ticket(ticket_id: int, usuario_id: int | None = None):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = _dict_factory
        if usuario_id is None:
            return conn.execute("""
                SELECT * FROM suporte_tickets WHERE id = ?
            """, (ticket_id,)).fetchone()
        return conn.execute("""
            SELECT * FROM suporte_tickets
             WHERE id = ? AND usuario_id = ?
        """, (ticket_id, usuario_id)).fetchone()


def listar_mensagens_ticket(ticket_id: int):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = _dict_factory
        return conn.execute("""
            SELECT sm.*, u.nickname AS autor_nick, u.nome AS autor_nome
              FROM suporte_mensagens sm
              LEFT JOIN usuarios u ON u.id = sm.autor_id
             WHERE sm.ticket_id = ?
             ORDER BY sm.criado_em ASC, sm.id ASC
        """, (ticket_id,)).fetchall()


def adicionar_mensagem_ticket(ticket_id: int, autor_id: int | None, is_staff: bool, mensagem: str):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            INSERT INTO suporte_mensagens (ticket_id, autor_id, is_staff, mensagem, criado_em)
            VALUES (?, ?, ?, ?, datetime('now'))
        """, (ticket_id, autor_id, 1 if is_staff else 0, mensagem))
        conn.execute("""
            UPDATE suporte_tickets
               SET atualizado_em = datetime('now')
             WHERE id = ?
        """, (ticket_id,))


def atualizar_status_ticket(ticket_id: int, novo_status: str):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            UPDATE suporte_tickets
               SET status = ?, atualizado_em = datetime('now')
             WHERE id = ?
        """, (novo_status, ticket_id))
