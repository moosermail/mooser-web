#!/usr/bin/env bash
# ─────────────────────────────────────────────────────
# Moosermail deploy
# Usage:
#   bash deploy.sh          (all)
#   bash deploy.sh landing
#   bash deploy.sh mcp
#   bash deploy.sh nginx
# ─────────────────────────────────────────────────────
set -eo pipefail

SERVER="mooser@165.22.169.31"
SSH="ssh -i ~/.ssh/mooser"
SCP="rsync -avz --quiet -e 'ssh -i ~/.ssh/mooser'"
REMOTE_DIR="/home/mooser/app"
TARGET="${1:-all}"

green() { echo -e "\033[0;32m[✓]\033[0m $1"; }

green "Syncing files to mooser@vps..."
eval rsync -avz --quiet \
  --exclude node_modules \
  --exclude mcp/dist \
  --exclude .git \
  --exclude "*.env" \
  -e "'ssh -i ~/.ssh/mooser'" \
  ./ ${SERVER}:${REMOTE_DIR}/

green "Files synced"

if [[ "$TARGET" == "all" || "$TARGET" == "mcp" || "$TARGET" == "landing" ]]; then
  green "Building and starting containers..."
  $SSH ${SERVER} bash -s << 'REMOTE'
    set -eo pipefail
    cd /home/mooser/app

    # Load env if present
    [ -f .env ] && export $(grep -v '^#' .env | xargs)

    docker compose up -d --build

    echo "[OK] Containers running"
    docker compose ps
REMOTE
  green "Containers deployed"
fi

if [[ "$TARGET" == "all" || "$TARGET" == "nginx" ]]; then
  green "Updating nginx..."
  $SSH ${SERVER} bash -s << 'REMOTE'
    set -eo pipefail
    sudo cp /home/mooser/app/nginx/mooser.conf /etc/nginx/sites-available/mooser.email
    sudo ln -sf /etc/nginx/sites-available/mooser.email /etc/nginx/sites-enabled/mooser.email
    sudo nginx -t && sudo systemctl reload nginx
    echo "[OK] Nginx updated"
REMOTE
  green "Nginx updated"
fi

green "Verifying..."
$SSH ${SERVER} bash -s << 'REMOTE'
  echo ""
  echo "=== Containers ==="
  docker compose -f /home/mooser/app/docker-compose.yml ps
  echo ""
  echo "=== Health ==="
  echo -n "Landing: "; curl -sf http://127.0.0.1:4000/ -o /dev/null && echo "OK" || echo "FAIL"
  echo -n "MCP:     "; curl -sf http://127.0.0.1:4001/health && echo "" || echo "FAIL"
  echo ""
REMOTE

green "Deploy complete!"
