#!/usr/bin/env bash
# Nieuwe versie van de Next-site ophalen en herladen.
# Draai dit als de deploy-gebruiker, niet als root:
#   bash deploy/update.sh
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ "$(id -u)" -eq 0 ]]; then
  printf '%s\n' "Voer update.sh uit als de deploy-gebruiker, niet als root." >&2
  exit 1
fi

git pull --ff-only
npm ci --include=dev
npm run build
pm2 reload deploy/ecosystem.config.cjs --update-env
printf '%s\n' "Next.js is herladen op 127.0.0.1:3100."

if sudo bash deploy/nginx/install-config.sh; then
  printf '%s\n' "Nginx is herladen."
else
  printf '%s\n' "De nieuwe site draait, maar Nginx is niet herladen. Controleer sudo en nginx -t." >&2
  exit 1
fi
