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

SERVER="supp@165.22.169.31"
REMOTE_DIR="/home/supp/mooser"
TARGET="${1:-all}"

green() { echo -e "\033[0;32m[✓]\033[0m $1"; }

green "Syncing files..."
rsync -avz --quiet \
  --exclude node_modules \
  --exclude mcp/dist \
  --exclude .git \
  --exclude "*.env" \
  ./ ${SERVER}:${REMOTE_DIR}/

green "Files synced"

if [[ "$TARGET" == "all" || "$TARGET" == "mcp" ]]; then
  green "Building MCP server..."
  ssh ${SERVER} bash -s << 'REMOTE'
    set -eo pipefail
    cd /home/supp/mooser/mcp
    npm ci && npm run build && npm prune --omit=dev

    if pm2 describe mooser-mcp > /dev/null 2>&1; then
      pm2 restart mooser-mcp --update-env
    else
      pm2 start /home/supp/mooser/ecosystem.config.cjs --only mooser-mcp
    fi
    pm2 save
    echo "[OK] MCP deployed"
REMOTE
  green "MCP deployed"
fi

if [[ "$TARGET" == "all" || "$TARGET" == "landing" ]]; then
  green "Deploying landing page..."
  ssh ${SERVER} bash -s << 'REMOTE'
    set -eo pipefail
    if pm2 describe mooser-landing > /dev/null 2>&1; then
      pm2 restart mooser-landing --update-env
    else
      pm2 start /home/supp/mooser/ecosystem.config.cjs --only mooser-landing
    fi
    pm2 save
    echo "[OK] Landing deployed"
REMOTE
  green "Landing deployed"
fi

if [[ "$TARGET" == "all" || "$TARGET" == "nginx" ]]; then
  green "Updating nginx..."
  ssh ${SERVER} bash -s << 'REMOTE'
    set -eo pipefail
    sudo cp /home/supp/mooser/nginx/mooser.conf /etc/nginx/sites-available/mooser.email
    sudo ln -sf /etc/nginx/sites-available/mooser.email /etc/nginx/sites-enabled/mooser.email
    sudo nginx -t && sudo systemctl reload nginx
    echo "[OK] Nginx updated"
REMOTE
  green "Nginx updated"
fi

green "Verifying..."
ssh ${SERVER} bash -s << 'REMOTE'
  echo ""
  echo "=== Mooser Processes ==="
  pm2 list | grep mooser || echo "none running"
  echo ""
  echo "=== Health ==="
  echo -n "Landing: "; curl -sf http://127.0.0.1:4000/ -o /dev/null && echo "OK" || echo "FAIL"
  echo -n "MCP:     "; curl -sf http://127.0.0.1:4001/health || echo "FAIL"
  echo ""
REMOTE

green "Deploy complete!"
