"""Transport HTTP des appels aux modèles : réponse lue en flux, erreurs communes et annulation en cours de route.

`http.client` plutôt que `requests` : la socket existe dès l'envoi de la requête, donc un autre thread peut la fermer (`Cancel.trigger`) même pendant que
le modèle « réfléchit » sans rien envoyer. Fermer la connexion arrête la génération chez Ollama ; les fournisseurs cloud cessent de produire (et de facturer) à ce moment.
"""
import http.client
import json
import socket
import threading
from urllib.parse import urlsplit


class LlmError(Exception):
    """Échec d'un appel au modèle. `status` = code HTTP à renvoyer à l'interface ; `usage` = tokens consommés malgré l'échec."""

    def __init__(self, message, status=502, usage=None):
        super().__init__(message)
        self.status = status
        self.usage = usage or {"in": 0, "out": 0}


class CreditError(LlmError):
    """Crédit ou quota du fournisseur épuisé : inutile de réessayer tant que le compte n'est pas rechargé."""


class Cancelled(LlmError):
    """Appel interrompu à la demande de l'utilisateur (ce n'est pas une panne)."""

    def __init__(self):
        super().__init__("Analyse annulée.", 499)


class Cancel:
    """Jeton d'annulation d'un appel : `trigger()` (depuis un autre thread) coupe la connexion en cours."""

    def __init__(self):
        self._lock = threading.Lock()
        self._sock = None
        self.cancelled = False

    def attach(self, sock):
        """Enregistre la socket de l'appel ; la coupe aussitôt si l'annulation est déjà demandée."""
        with self._lock:
            self._sock = sock
            if self.cancelled:
                self._cut()

    def trigger(self):
        """Demande l'annulation : l'appel en cours lève `Cancelled`."""
        with self._lock:
            self.cancelled = True
            self._cut()

    def _cut(self):
        try:
            if self._sock:
                self._sock.shutdown(socket.SHUT_RDWR)
        except OSError:
            pass            # déjà fermée


def is_credit_problem(status, text):
    """Le fournisseur dit-il que le crédit ou le quota est épuisé ?"""
    return status == 402 or any(s in text for s in ("credit balance", "insufficient_quota", "insufficient credits", "Insufficient Balance"))


def api_error(status, text, name):
    """Erreur renvoyée par le fournisseur (code HTTP ou évènement d'erreur dans le flux), sous la forme d'une LlmError."""
    if is_credit_problem(status, text):
        return CreditError(f"Crédit ou quota {name} épuisé : recharge ton compte chez le fournisseur.")
    return LlmError(f"{name} {status} : {text[:200]}")


def stream_lines(url, headers, body, timeout, name, cancel=None):
    """POST JSON ; renvoie les lignes de la réponse au fur et à mesure. `timeout` = silence maximal entre deux morceaux.

    Lève LlmError / CreditError (réponse en erreur, connexion perdue) ou Cancelled (si `cancel` est déclenché)."""
    if cancel and cancel.cancelled:
        raise Cancelled()
    parts = urlsplit(url)
    connection = (http.client.HTTPSConnection if parts.scheme == "https" else http.client.HTTPConnection)(parts.netloc, timeout=timeout)
    path = parts.path + (f"?{parts.query}" if parts.query else "")

    def failure(e):
        if cancel and cancel.cancelled:
            return Cancelled()
        if isinstance(e, TimeoutError):
            return LlmError(f"{name} : aucune réponse depuis {timeout} s.")
        return LlmError(f"{name} injoignable : {e}")

    try:
        try:
            connection.connect()
            if cancel:
                cancel.attach(connection.sock)
            connection.request("POST", path, json.dumps(body), headers)
            response = connection.getresponse()
        except (OSError, http.client.HTTPException) as e:
            raise failure(e)
        if response.status != 200:
            raise api_error(response.status, response.read().decode("utf-8", "replace"), name)
        while True:
            try:
                line = response.readline()
            except (OSError, http.client.HTTPException) as e:
                raise failure(e)
            if cancel and cancel.cancelled:
                raise Cancelled()
            if not line:
                return
            yield line.decode("utf-8", "replace").strip()
    finally:
        connection.close()
