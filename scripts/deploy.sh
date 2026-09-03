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

# Lockfiles / builds Next dans le dossier parent → mauvaise racine Turbopack.
PARENT_DIR="$(dirname "$APP_DIR")"
for lock in package-lock.json pnpm-lock.yaml yarn.lock bun.lock bun.lockb; do
  if [ -f "$PARENT_DIR/$lock" ]; then
    if mv -f "$PARENT_DIR/$lock" "$PARENT_DIR/$lock.dmk-bak" 2>/dev/null; then
      echo "==> Neutralisation $PARENT_DIR/$lock → .dmk-bak"
    else
      echo "==> WARN: impossible de déplacer $PARENT_DIR/$lock"
    fi
  fi
done
if [ -d "$PARENT_DIR/.next" ]; then
  rm -rf "$PARENT_DIR/.next.dmk-bak" 2>/dev/null || true
  if mv "$PARENT_DIR/.next" "$PARENT_DIR/.next.dmk-bak" 2>/dev/null; then
    echo "==> Neutralisation $PARENT_DIR/.next → .next.dmk-bak"
  else
    echo "==> WARN: impossible de déplacer $PARENT_DIR/.next"
  fi
fi

echo "==> npm install"
npm install

echo "==> prisma generate"
npx prisma generate

echo "==> build (+ copie static → public/media-next)"
rm -rf .next public/media-next
npm run build || {
  echo "==> ERREUR build — derniers logs npm éventuels ci-dessus"
  exit 1
}
echo "==> Contenu public/media-next :"
find public/media-next -type f 2>/dev/null | head -n 10 || true

if [ ! -d "$APP_DIR/public/media-next/_next/static" ]; then
  echo "==> ERREUR : public/media-next/_next/static manquant après le build"
  exit 1
fi
css_count="$(find public/media-next/_next/static -name '*.css' 2>/dev/null | wc -l | tr -d ' ')"
if [ "$css_count" = "0" ]; then
  echo "==> Erreur : aucun CSS dans public/media-next/_next/static"
  exit 1
fi
echo "==> media-next static OK — CSS : $css_count fichier(s)"

echo "==> restart tmux ($SESSION)"
tmux kill-session -t "$SESSION" 2>/dev/null || true
tmux new-session -d -s "$SESSION" "bash -lc 'source ~/.nvm/nvm.sh && nvm use && cd \"$APP_DIR\" && npm start -- -p $PORT'"

echo "==> attente démarrage"
ok=0
for _ in $(seq 1 20); do
  if curl -sf "http://127.0.0.1:$PORT/login" > /dev/null; then
    ok=1
    break
  fi
  sleep 1
done
if [ "$ok" != "1" ]; then
  echo "==> ERREUR : l'app ne répond pas sur le port $PORT"
  tmux capture-pane -t "$SESSION" -p -S -80 2>/dev/null || true
  exit 1
fi
echo "==> App OK sur le port $PORT"

ASSET="$(curl -sf "http://127.0.0.1:$PORT/login" | grep -oE '/media-next/_next/static/[^\"[:space:]]+\.(css|js)' | head -1 || true)"
if [ -z "$ASSET" ]; then
  # fallback: ancien chemin si assetPrefix absent
  ASSET="$(curl -sf "http://127.0.0.1:$PORT/login" | grep -oE '/_next/static/[^\"[:space:]]+\.(css|js)' | head -1 || true)"
fi
if [ -z "$ASSET" ]; then
  echo "==> ERREUR : aucun asset static trouvé dans /login"
  exit 1
fi
echo "==> Contrôle asset $ASSET"
code="$(curl -s -o /tmp/dmk-asset-check -w '%{http_code}' "http://127.0.0.1:$PORT$ASSET")"
if [ "$code" != "200" ]; then
  echo "==> ERREUR : $ASSET → HTTP $code (attendu 200)"
  head -c 300 /tmp/dmk-asset-check; echo
  tmux capture-pane -t "$SESSION" -p -S -80 2>/dev/null || true
  exit 1
fi
echo "==> Asset OK (HTTP 200, $(wc -c </tmp/dmk-asset-check) octets)"

echo "==> Déploiement terminé"
