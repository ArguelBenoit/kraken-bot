"""Marchés passés proposés au backtest du Bot IA : une date de fin (bougies de Binance, rejouées à l'identique) et la tendance du bitcoin sur la période.
Les chiffres sont ceux de BTC/USDT vérifiés sur les bougies journalières de Binance, sur 14 et 30 jours avant `end`."""

TRENDS = ("hausse", "baisse", "range")      # range = sans tendance

SCENARIOS = [
    {"trend": "hausse", "end": "2024-03-14", "when": "mars 2024", "note": "BTC +17 % sur 14 j, +46 % sur 30 j"},
    {"trend": "hausse", "end": "2023-01-21", "when": "janv. 2023", "note": "BTC +34 % sur 14 j, +35 % sur 30 j (rebond après le creux de 2022)"},
    {"trend": "hausse", "end": "2023-10-29", "when": "oct. 2023", "note": "BTC +27 % sur 14 j, +26 % sur 30 j"},
    {"trend": "hausse", "end": "2024-11-22", "when": "nov. 2024", "note": "BTC +30 % sur 14 j, +46 % sur 30 j"},
    {"trend": "hausse", "end": "2026-08-27", "when": "août 2026", "note": "BTC +25 % sur 14 j, +24 % sur 30 j"},
    {"trend": "baisse", "end": "2022-06-20", "when": "juin 2022", "note": "BTC −31 % sur 14 j, −30 % sur 30 j (effondrement puis fort rebond le 18/06)"},
    {"trend": "baisse", "end": "2022-05-12", "when": "mai 2022", "note": "BTC −26 % sur 14 j, −26 % sur 30 j (chute de Terra Luna)"},
    {"trend": "baisse", "end": "2022-11-14", "when": "nov. 2022", "note": "BTC −21 % sur 14 j, −15 % sur 30 j (faillite de FTX)"},
    {"trend": "baisse", "end": "2022-08-28", "when": "août 2022", "note": "BTC −18 % sur 14 j, −16 % sur 30 j (baisse progressive)"},
    {"trend": "baisse", "end": "2026-02-07", "when": "févr. 2026", "note": "BTC −21 % sur 14 j, −23 % sur 30 j"},
    {"trend": "range", "end": "2023-09-20", "when": "sept. 2023", "note": "BTC +5 % sur 14 j, +4 % sur 30 j (marché calme)"},
    {"trend": "range", "end": "2023-08-10", "when": "août 2023", "note": "BTC +1 % sur 14 j, −3 % sur 30 j (très calme)"},
    {"trend": "range", "end": "2024-06-16", "when": "juin 2024", "note": "BTC −2 % sur 14 j, +2 % sur 30 j"},
    {"trend": "range", "end": "2024-12-24", "when": "déc. 2024", "note": "BTC −3 % sur 14 j, −3 % sur 30 j (agité, va-et-vient de 12 %)"},
    {"trend": "range", "end": "2025-09-24", "when": "sept. 2025", "note": "BTC +0,4 % sur 14 j, −1 % sur 30 j"},
]
