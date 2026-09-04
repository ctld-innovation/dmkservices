#!/bin/bash
# Déploiement production — exécuté sur le VPS via GitHub Actions (SSH).
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

PARENT_DIR="$(dirname "$APP_DIR")"
for lock in package-lock.json pnpm-lock.yaml yarn.lock bun.lock bun.lockb; do
  if [ -f "$PARENT_DIR/$lock" ] && [ ! -f "$PARENT_DIR/package.json" ]; then
    mv -f "$PARENT_DIR/$lock" "$PARENT_DIR/$lock.dmk-bak" 2>/dev/null \
      && echo "==> Neutralisation $PARENT_DIR/$lock" \
      || echo "==> WARN: impossible de déplacer $PARENT_DIR/$lock"
  fi
done

echo "==> npm install"
npm install

echo "==> prisma generate"
npx prisma generate

echo "==> build (webpack + copie public/media-next)"
rm -rf .next public/media-next
npm run build

if [ ! -d "public/media-next/_next/static" ]; then
  echo "==> ERREUR : public/media-next/_next/static manquant"
  exit 1
fi
css_count="$(find public/media-next/_next/static -name '*.css' | wc -l | tr -d ' ')"
echo "==> CSS copiés : $css_count"

echo "==> restart tmux ($SESSION)"
tmux kill-session -t "$SESSION" 2>/dev/null || true
tmux new-session -d -s "$SESSION" "bash -lc 'source ~/.nvm/nvm.sh && nvm use && cd $APP_DIR && npm start -- -p $PORT'"

ok=0
for _ in $(seq 1 25); do
  if curl -sf "http://127.0.0.1:$PORT/login" >/dev/null; then
    ok=1
    break
  fi
  sleep 1
done
if [ "$ok" != "1" ]; then
  echo "==> ERREUR : app down sur :$PORT"
  tmux capture-pane -t "$SESSION" -p -S -50 2>/dev/null || true
  exit 1
fi

HTML="$(curl -sf "http://127.0.0.1:$PORT/login")"
if ! echo "$HTML" | grep -q '/media-next/_next/static/'; then
  echo "==> ERREUR : assetPrefix absent du HTML (pas de /media-next/_next/static/)"
  echo "$HTML" | tr '"' '\n' | grep static | head -10
  exit 1
fi

ASSET="$(echo "$HTML" | grep -oE '/media-next/_next/static/[^\" ]+\.(css|js)' | head -1 || true)"
echo "==> Contrôle $ASSET"
code="$(curl -s -o /tmp/dmk-a -w '%{http_code}' "http://127.0.0.1:$PORT$ASSET")"
if [ "$code" != "200" ]; then
  echo "==> ERREUR asset HTTP $code"
  head -c 200 /tmp/dmk-a; echo
  ls -la "public${ASSET}" 2>&1 || ls -la "public/media-next/_next/static" | head
  tmux capture-pane -t "$SESSION" -p -S -50 2>/dev/null || true
  exit 1
fi
echo "==> Asset OK ($(wc -c </tmp/dmk-a) octets)"
echo "==> Déploiement terminé"
