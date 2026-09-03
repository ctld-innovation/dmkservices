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

# Lockfiles / builds Next dans le dossier parent → mauvaise racine Turbopack
# et 500 sur /_next/static (même si le HTML répond 200).
PARENT_DIR="$(dirname "$APP_DIR")"
for lock in package-lock.json pnpm-lock.yaml yarn.lock bun.lock bun.lockb; do
  if [ -f "$PARENT_DIR/$lock" ]; then
    echo "==> Neutralisation $PARENT_DIR/$lock → .dmk-bak"
    mv -f "$PARENT_DIR/$lock" "$PARENT_DIR/$lock.dmk-bak"
  fi
done
if [ -d "$PARENT_DIR/.next" ]; then
  echo "==> Neutralisation $PARENT_DIR/.next → .next.dmk-bak"
  rm -rf "$PARENT_DIR/.next.dmk-bak"
  mv "$PARENT_DIR/.next" "$PARENT_DIR/.next.dmk-bak"
fi

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
tmux new-session -d -s "$SESSION" "bash -lc 'source ~/.nvm/nvm.sh && nvm use && cd $APP_DIR && PORT=$PORT npm start'"

echo "==> attente démarrage"
ok=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf "http://127.0.0.1:$PORT/login" > /dev/null; then
    ok=1
    break
  fi
  sleep 1
done
if [ "$ok" != "1" ]; then
  echo "==> Attention : l'app ne répond pas sur le port $PORT"
  tmux capture-pane -t "$SESSION" -p 2>/dev/null | tail -n 40 || true
  exit 1
fi

# Vérifie un vrai asset — c'est là que ça cassait (HTML 200 + static 500).
ASSET="$(curl -sf "http://127.0.0.1:$PORT/login" | grep -oE '/_next/static/[^\"[:space:]]+\.(css|js)' | head -1 || true)"
if [ -z "$ASSET" ]; then
  echo "==> ERREUR : aucun asset /_next/static trouvé dans /login"
  exit 1
fi
echo "==> Contrôle asset $ASSET"
code="$(curl -s -o /tmp/dmk-asset-check -w '%{http_code}' "http://127.0.0.1:$PORT$ASSET")"
if [ "$code" != "200" ]; then
  echo "==> ERREUR : $ASSET → HTTP $code (attendu 200)"
  head -c 200 /tmp/dmk-asset-check; echo
  exit 1
fi
echo "==> Asset OK (HTTP 200)"

echo "==> Déploiement terminé"
