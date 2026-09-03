#!/bin/bash
# Déploiement production — exécuté sur le VPS via GitHub Actions (SSH).
# Prérequis serveur : .env configuré, accès git au repo privé (deploy key).
set -euo pipefail

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use || nvm use default
echo "==> Node $(node -v) / npm $(npm -v)"

APP_DIR="/home/ubuntu/dmkservices"
SESSION="dmkservices"
PORT=3003
BRANCH="main"

cd "$APP_DIR"

echo "==> Déploiement $(date -Is) — branche $BRANCH"

echo "==> git fetch + reset"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> npm install"
npm install

echo "==> prisma generate"
npx prisma generate

echo "==> build"
npm run build

echo "==> restart tmux ($SESSION)"
tmux kill-session -t "$SESSION" 2>/dev/null || true
tmux new-session -d -s "$SESSION" "bash -lc 'source ~/.nvm/nvm.sh && nvm use && cd $APP_DIR && npm start -- -p $PORT'"

sleep 2
if curl -sf "http://127.0.0.1:$PORT" > /dev/null; then
  echo "==> App OK sur le port $PORT"
else
  echo "==> Attention : l'app ne répond pas encore sur le port $PORT"
  exit 1
fi

echo "==> Déploiement terminé"
