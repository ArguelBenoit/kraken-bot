"""Fabrique de l'application Flask : mot de passe optionnel, routes API et interface React."""
import hmac
import os

from flask import Flask, Response, request

from server import settings
from .routes import BLUEPRINTS


def _require_password():
    """Mot de passe optionnel (APP_PASSWORD dans .env) : HTTP Basic, n'importe quel identifiant. Exigé sauf en localhost."""
    password = os.getenv("APP_PASSWORD")
    if password and request.remote_addr not in ("127.0.0.1", "::1"):
        auth = request.authorization
        if not auth or not hmac.compare_digest(auth.password or "", password):
            return Response("Mot de passe requis", 401, {"WWW-Authenticate": 'Basic realm="Kraken Bot"'})
    return None


def create_app():
    settings.load_dotenv()
    app = Flask(__name__, static_folder=None)
    app.before_request(_require_password)
    for blueprint in BLUEPRINTS:
        app.register_blueprint(blueprint)
    return app
