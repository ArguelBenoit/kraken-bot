"""Journal en mémoire d'un bot : les derniers événements, affichés dans l'interface."""
from datetime import datetime


class Journal:
    def __init__(self, size=100):
        self._size = size
        self._lines = []

    def add(self, message):
        self._lines.append(f"{datetime.now():%H:%M:%S}  {message}")
        del self._lines[:-self._size]

    def recent(self, n):
        """Les `n` derniers événements, du plus récent au plus ancien."""
        return self._lines[-n:][::-1]
