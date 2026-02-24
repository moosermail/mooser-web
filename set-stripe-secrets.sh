#!/bin/bash
# Usage: ./set-stripe-secrets.sh --sk sk_live_... --pk pk_live_...
set -e

while [[ $# -gt 0 ]]; do
  case "$1" in
    --sk) STRIPE_SK="$2"; shift 2 ;;
    --pk) STRIPE_PK="$2"; shift 2 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

: "${STRIPE_SK:?--sk <secret_key> is required}"
: "${STRIPE_PK:?--pk <publishable_key> is required}"

# 1. Ensure Supabase CLI is available
if ! command -v supabase &>/dev/null; then
  echo "Installing Supabase CLI..."
  brew install supabase/tap/supabase
fi

# 2. Set Supabase edge function secrets (only touches what we pass)
echo "Setting Supabase secrets..."
supabase secrets set \
  --project-ref gmbyfkvvyppghvvtkxev \
  STRIPE_SECRET_KEY="$STRIPE_SK" \
  STRIPE_WEBHOOK_SECRET="whsec_rA3u4eyj366hPMGl10G9arccOqMjZP7Y" \
  PRICE_BASIC="price_1T4EfCFGfKr5HrNEOvELQkda" \
  PRICE_PRO="price_1T4Kg5FGfKr5HrNEsYXRv751"

echo "Supabase secrets set."

# 3. Upsert keys into VPS .env and restart app
echo "Updating VPS .env..."
ssh mooser@165.22.169.31 "
  set -e
  ENV_FILE=/home/mooser/app/.env

  upsert_env() {
    local key=\"\$1\"
    local val=\"\$2\"
    if grep -q \"^\${key}=\" \"\$ENV_FILE\" 2>/dev/null; then
      sed -i \"s|^\${key}=.*|\${key}=\${val}|\" \"\$ENV_FILE\"
    else
      echo \"\${key}=\${val}\" >> \"\$ENV_FILE\"
    fi
  }

  upsert_env STRIPE_SECRET_KEY     \"$STRIPE_SK\"
  upsert_env STRIPE_PUBLISHABLE_KEY \"$STRIPE_PK\"
  upsert_env NEXT_PUBLIC_STRIPE_PK  \"$STRIPE_PK\"
  upsert_env STRIPE_PRICE_BASIC     \"price_1T4EfCFGfKr5HrNEOvELQkda\"
  upsert_env STRIPE_PRICE_PRO       \"price_1T4Kg5FGfKr5HrNEsYXRv751\"

  cd /home/mooser/app
  docker compose up -d --build mooser-app
"

echo "Done. Stripe billing is live."
