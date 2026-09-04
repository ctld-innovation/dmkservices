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

# Lockfiles / .next orphelins dans le parent → mauvaise racine Next/Turbopack.
PARENT_DIR="$(dirname "$APP_DIR")"
for lock in package-lock.json pnpm-lock.yaml yarn.lock bun.lock bun.lockb; do
  if [ -f "$PARENT_DIR/$lock" ] && [ ! -f "$PARENT_DIR/package.json" ]; then
    mv -f "$PARENT_DIR/$lock" "$PARENT_DIR/$lock.dmk-bak" 2>/dev/null \
      && echo "==> Neutralisation $PARENT_DIR/$lock" \
      || echo "==> WARN: impossible de déplacer $PARENT_DIR/$lock"
  fi
done
if [ -d "$PARENT_DIR/.next" ]; then
  rm -rf "$PARENT_DIR/.next.dmk-bak" 2>/dev/null || true
  mv "$PARENT_DIR/.next" "$PARENT_DIR/.next.dmk-bak" 2>/dev/null \
    && echo "==> Neutralisation $PARENT_DIR/.next" \
    || echo "==> WARN: impossible de déplacer $PARENT_DIR/.next"
fi

echo "==> npm install"
npm install

echo "==> prisma generate"
npx prisma generate

echo "==> build"
rm -rf .next public/media-next
npm run build

if [ ! -d "$APP_DIR/.next/static" ]; then
  echo "==> ERREUR : .next/static manquant après le build"
  exit 1
fi
css_count="$(find .next/static -name '*.css' 2>/dev/null | wc -l | tr -d ' ')"
if [ "$css_count" = "0" ]; then
  echo "==> ERREUR : aucun CSS dans .next/static"
  exit 1
fi
echo "==> .next/static OK — CSS : $css_count fichier(s)"
echo "==> Exemples CSS :"
find .next/static -name '*.css' | head -5

kill_port() {
  local pids
  pids="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "==> Kill process(es) sur :$PORT → $pids"
    # shellcheck disable=SC2086
    kill -TERM $pids 2>/dev/null || true
    sleep 1
    pids="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
    if [ -n "$pids" ]; then
      # shellcheck disable=SC2086
      kill -KILL $pids 2>/dev/null || true
      sleep 1
    fi
  fi
  if lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "==> ERREUR : le port $PORT est encore occupé"
    lsof -iTCP:"$PORT" -sTCP:LISTEN || true
    exit 1
  fi
}

echo "==> stop ancien process"
tmux kill-session -t "$SESSION" 2>/dev/null || true
kill_port

echo "==> start tmux ($SESSION) → node server.cjs"
tmux new-session -d -s "$SESSION" \
  "bash -lc 'source ~/.nvm/nvm.sh && nvm use && cd \"$APP_DIR\" && export PORT=$PORT HOSTNAME=127.0.0.1 && exec npm start'"

echo "==> attente démarrage"
ok=0
for _ in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:$PORT/login" >/dev/null; then
    ok=1
    break
  fi
  sleep 1
done
if [ "$ok" != "1" ]; then
  echo "==> ERREUR : app down sur :$PORT"
  tmux capture-pane -t "$SESSION" -p -S -100 2>/dev/null || true
  exit 1
fi
echo "==> App OK sur le port $PORT"
tmux capture-pane -t "$SESSION" -p -S -30 2>/dev/null || true

# Le HTML doit référencer un fichier qui existe dans CE build (pas un vieux process).
HTML="$(curl -sf "http://127.0.0.1:$PORT/login")"
ASSET="$(echo "$HTML" | grep -oE '/_next/static/[^\"[:space:]]+\.(css|js)' | head -1 || true)"
if [ -z "$ASSET" ]; then
  echo "==> ERREUR : aucun asset /_next/static dans /login"
  exit 1
fi
REL="${ASSET#/_next/static/}"
echo "==> Contrôle asset $ASSET"
if [ ! -f ".next/static/$REL" ]; then
  echo "==> ERREUR : $ASSET absent du build disque (ancien process ou mauvais .next ?)"
  echo "==> CSS présents :"
  find .next/static -name '*.css' | head -10
  echo "==> Process sur :$PORT :"
  lsof -iTCP:"$PORT" -sTCP:LISTEN || true
  tmux capture-pane -t "$SESSION" -p -S -100 2>/dev/null || true
  exit 1
fi

code="$(curl -s -o /tmp/dmk-a -w '%{http_code}' "http://127.0.0.1:$PORT$ASSET")"
if [ "$code" != "200" ]; then
  echo "==> ERREUR : $ASSET → HTTP $code (attendu 200)"
  head -c 300 /tmp/dmk-a; echo
  tmux capture-pane -t "$SESSION" -p -S -100 2>/dev/null || true
  exit 1
fi
echo "==> Asset OK (HTTP 200, $(wc -c </tmp/dmk-a) octets)"
echo "==> Déploiement terminé"
