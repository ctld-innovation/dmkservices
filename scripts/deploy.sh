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
  if rm -rf "$PARENT_DIR/.next" 2>/dev/null; then
    echo "==> Suppression $PARENT_DIR/.next"
  else
    mv "$PARENT_DIR/.next" "$PARENT_DIR/.next.dmk-bak.$$" 2>/dev/null \
      && echo "==> Neutralisation $PARENT_DIR/.next" \
      || echo "==> WARN: $PARENT_DIR/.next toujours présent (permissions ?)"
  fi
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
BUILT_CSS="$(find .next/static -name '*.css' | head -1)"
BUILD_ID="$(cat .next/BUILD_ID 2>/dev/null || echo '?')"
echo "==> .next/static OK — CSS : $css_count | BUILD_ID=$BUILD_ID"
echo "==> Exemple CSS : $BUILT_CSS"

# Pids qui écoutent sur PORT (ss en priorité — lsof souvent absent).
pids_on_port() {
  if command -v ss >/dev/null 2>&1; then
    ss -lptn "sport = :$PORT" 2>/dev/null \
      | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u || true
  elif command -v lsof >/dev/null 2>&1; then
    lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true
  elif command -v fuser >/dev/null 2>&1; then
    fuser "${PORT}/tcp" 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+$' || true
  else
    echo ""
  fi
}

show_port() {
  echo "==> Écoute :$PORT"
  if command -v ss >/dev/null 2>&1; then
    ss -lptn "sport = :$PORT" 2>/dev/null || true
  fi
  local p
  for p in $(pids_on_port); do
    echo "  pid=$p cmdline=$(tr '\0' ' ' < /proc/$p/cmdline 2>/dev/null || echo '?')"
  done
}

kill_port() {
  echo "==> Libération du port $PORT"
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${PORT}/tcp" 2>/dev/null || true
    sleep 1
  fi
  local pids
  pids="$(pids_on_port)"
  if [ -n "$pids" ]; then
    echo "==> Kill PID(s): $pids"
    # shellcheck disable=SC2086
    kill -TERM $pids 2>/dev/null || true
    sleep 2
    pids="$(pids_on_port)"
    if [ -n "$pids" ]; then
      # shellcheck disable=SC2086
      kill -KILL $pids 2>/dev/null || true
      sleep 1
    fi
  fi
  # Dernier recours : pkill node dans APP_DIR
  pkill -f "$APP_DIR.*server.cjs" 2>/dev/null || true
  pkill -f "next-server" 2>/dev/null || true
  pkill -f "next start" 2>/dev/null || true
  sleep 1

  if [ -n "$(pids_on_port)" ]; then
    echo "==> ERREUR : port $PORT toujours occupé"
    show_port
    exit 1
  fi
  echo "==> Port $PORT libre"
}

echo "==> stop ancien process"
tmux kill-session -t "$SESSION" 2>/dev/null || true
kill_port

echo "==> start tmux ($SESSION) → node server.cjs"
tmux new-session -d -s "$SESSION" \
  "bash -lc 'source ~/.nvm/nvm.sh && nvm use && cd \"$APP_DIR\" && export PORT=$PORT HOSTNAME=127.0.0.1 && exec node server.cjs'"

echo "==> attente démarrage (Ready)"
ok=0
for _ in $(seq 1 45); do
  if tmux capture-pane -t "$SESSION" -p -S -20 2>/dev/null | grep -q "Ready on"; then
    ok=1
    break
  fi
  # Si le process a crashé tout de suite
  if ! tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "==> ERREUR : session tmux morte au démarrage"
    break
  fi
  sleep 1
done

echo "==> Logs tmux :"
tmux capture-pane -t "$SESSION" -p -S -40 2>/dev/null || true
show_port

if [ "$ok" != "1" ]; then
  echo "==> ERREUR : server.cjs n'a pas affiché Ready"
  exit 1
fi

# Vérifier que c'est bien notre server.cjs qui écoute
listening="$(pids_on_port)"
if [ -z "$listening" ]; then
  echo "==> ERREUR : rien n'écoute sur :$PORT après Ready"
  exit 1
fi
for p in $listening; do
  cmd="$(tr '\0' ' ' < /proc/$p/cmdline 2>/dev/null || true)"
  echo "==> Listener $p : $cmd"
  if ! echo "$cmd" | grep -q "server.cjs"; then
    echo "==> ERREUR : le process sur :$PORT n'est pas server.cjs"
    exit 1
  fi
done

if ! curl -sf "http://127.0.0.1:$PORT/login" >/dev/null; then
  echo "==> ERREUR : /login ne répond pas"
  exit 1
fi
echo "==> App OK sur le port $PORT"

HTML="$(curl -sf "http://127.0.0.1:$PORT/login")"
# Webpack → /_next/static/css/... ; Turbopack → /_next/static/chunks/….css
if echo "$HTML" | grep -q 'turbopack-'; then
  echo "==> ERREUR : HTML encore Turbopack (mauvais process / mauvais .next)"
  echo "$HTML" | tr '"' '\n' | grep -E '_next/static|turbopack' | head -15
  show_port
  exit 1
fi

ASSET="$(echo "$HTML" | grep -oE '/_next/static/[^\"[:space:]]+\.(css|js)' | head -1 || true)"
if [ -z "$ASSET" ]; then
  echo "==> ERREUR : aucun asset /_next/static dans /login"
  exit 1
fi
REL="${ASSET#/_next/static/}"
echo "==> Contrôle asset $ASSET"
if [ ! -f ".next/static/$REL" ]; then
  echo "==> ERREUR : $ASSET absent du build disque"
  echo "==> CSS présents :"
  find .next/static -name '*.css' | head -10
  show_port
  exit 1
fi

code="$(curl -s -o /tmp/dmk-a -w '%{http_code}' "http://127.0.0.1:$PORT$ASSET")"
if [ "$code" != "200" ]; then
  echo "==> ERREUR : $ASSET → HTTP $code (attendu 200)"
  head -c 300 /tmp/dmk-a; echo
  tmux capture-pane -t "$SESSION" -p -S -40 2>/dev/null || true
  exit 1
fi
echo "==> Asset OK (HTTP 200, $(wc -c </tmp/dmk-a) octets)"
echo "==> Déploiement terminé"
