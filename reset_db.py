
# --> Script para dar um Drop no banco de dados (Somente para desenvolvimento)
import os
from db import DB_PATH, init_db

def main():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print(f"Arquivo removido: {DB_PATH}")
    else:
        print("Arquivo de banco não existia. Criando do zero...")

    init_db()
    print("Banco recriado com seeds.")

if __name__ == "__main__":
    main()
