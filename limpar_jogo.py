# --> Somente para desenvolvimento (não é utilizado no projeto final.)

import sqlite3
from db import DB_PATH

TITULO_ALVO = "fff"

APAGAR_BUILD_TAMBEM = True
def main():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.row_factory = sqlite3.Row

        jogos = conn.execute(
            "SELECT id, titulo, build_slug FROM jogos WHERE titulo = ? COLLATE NOCASE;",
            (TITULO_ALVO,)
        ).fetchall()

        if not jogos:
            print("Nenhum jogo encontrado (comparação exata).")
            return

        print("Jogos a excluir:")
        for r in jogos:
            print(f"- id={r['id']} | titulo={r['titulo']} | build_slug={r['build_slug']}")

        conn.execute("BEGIN;")
        try:
            for r in jogos:
                jid = r["id"]
                bslug = r["build_slug"]

                conn.execute("DELETE FROM compras WHERE jogo_id = ?;", (jid,))

                conn.execute("DELETE FROM jogos WHERE id = ?;", (jid,))

                if APAGAR_BUILD_TAMBEM and bslug:
                    conn.execute("DELETE FROM builds WHERE slug = ?;", (bslug,))

            conn.commit()
            print("Exclusão concluída.")
        except Exception as e:
            conn.rollback()
            print("Falha ao excluir:", e)
            return

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("VACUUM;")
    print("VACUUM executado.")

if __name__ == "__main__":
    main()
