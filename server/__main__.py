"""Point d'entrée : `python -m server` (lancé par ./run.sh)."""
import os

from server.app import create_app


def main():
    host = os.getenv("HOST", "127.0.0.1")          # 0.0.0.0 = accessible depuis le réseau local
    if host not in ("127.0.0.1", "localhost") and not os.getenv("APP_PASSWORD"):
        print("ATTENTION : accessible sur le réseau SANS mot de passe (définis APP_PASSWORD dans .env)")
    create_app().run(host=host, port=int(os.getenv("PORT", "5000")))


if __name__ == "__main__":
    main()
