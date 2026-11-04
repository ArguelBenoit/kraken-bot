#!/usr/bin/env bash
# Lance tout en une commande.   ./run.sh        -> développement (UI sur http://127.0.0.1:5173, rechargement à chaud)
#                               ./run.sh prod   -> build de l'UI puis un seul serveur sur http://127.0.0.1:5000
set -euo pipefail
cd "$(dirname "$0")/web"
[ -d node_modules ] || npm install
if [ "${1:-dev}" = "prod" ]; then
  npm run build
  exec node scripts/api.mjs
fi
exec npm run dev
