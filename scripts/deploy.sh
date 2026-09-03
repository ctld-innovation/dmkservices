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

# Un lockfile orphelin dans le dossier parent (ex. /home/ubuntu/package-lock.json)
# fait mal détecter la racine Turbopack → 500 sur /_next/static en prod.
PARENT_DIR="$(dirname "$APP_DIR")"
for lock in package-lock.json pnpm-lock.yaml yarn.lock bun.lock bun.lockb; do
  if [ -f "$PARENT_DIR/$lock" ] && [ ! -f "$PARENT_DIR/package.json" ]; then
    echo "==> Lockfile orphelin détecté : $PARENT_DIR/$lock — renommage (.dmk-bak)"
    mv "$PARENT_DIR/$lock" "$PARENT_DIR/$lock.dmk-bak"
  fi
done

echo "==> npm install"
npm install

echo "==> prisma generate"
npx prisma generate

echo "==> build"
rm -rf .next
npm run build

if [ ! -d "$APP_DIR/.next/static" ]; then
  echo "==> ERREUR : .next/static manquant après le build"
  exit 1
fi
css_count="$(find .next/static -name '*.css' 2>/dev/null | wc -l | tr -d ' ')"
if [ "$css_count" = "0" ]; then
  echo "==> Erreur : aucun CSS généré dans .next/static"
  exit 1
fi
echo "==> .next/static OK — CSS générés : $css_count fichier(s)"

echo "==> restart tmux ($SESSION)"
tmux kill-session -t "$SESSION" 2>/dev/null || true
tmux new-session -d -s "$SESSION" "bash -lc 'source ~/.nvm/nvm.sh && nvm use && cd $APP_DIR && npm start -- -p $PORT'"

sleep 5
if curl -sf "http://127.0.0.1:$PORT/login" > /dev/null; then
  echo "==> App OK sur le port $PORT"
else
  echo "==> Attention : l'app ne répond pas encore sur le port $PORT"
  exit 1
fi

echo "==> Déploiement terminé"
