#!/usr/bin/env bash
# Wildcard-certificaat via DNS-01. HTTP-01 kan *.defaultstack.online niet uitgeven.
#
#   sudo bash deploy/tls/obtain-wildcard-dns01.sh manual
#   sudo bash deploy/tls/obtain-wildcard-dns01.sh cloudflare
#
# manual: Certbot toont een TXT-record. Zet dat bij de registrar en druk op Enter.
# cloudflare: DNS staat bij Cloudflare. Token in /root/.secrets/certbot/cloudflare.ini
#             (zie cloudflare.ini.example). Andere registrars: gebruik manual, of
#             verhuis alleen de nameservers naar Cloudflare.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  printf '%s\n' "Gebruik sudo." >&2
  exit 1
fi

mode="${1:-}"
email="${CERTBOT_EMAIL:-codedbydefault@gmail.com}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cred="${CLOUDFLARE_INI:-/root/.secrets/certbot/cloudflare.ini}"

case "$mode" in
  manual)
    certbot certonly --manual --preferred-challenges dns \
      --agree-tos --email "$email" \
      --cert-name defaultstack.online-wildcard \
      -d defaultstack.online \
      -d '*.defaultstack.online'
    ;;
  cloudflare)
    apt-get update
    apt-get install -y python3-certbot-dns-cloudflare
    if [[ ! -f "$cred" ]]; then
      printf '%s\n' "Maak ${cred} (chmod 600). Voorbeeld: deploy/tls/cloudflare.ini.example" >&2
      exit 1
    fi
    chmod 600 "$cred"
    certbot certonly --dns-cloudflare \
      --dns-cloudflare-credentials "$cred" \
      --dns-cloudflare-propagation-seconds 60 \
      --non-interactive --agree-tos --email "$email" \
      --cert-name defaultstack.online-wildcard \
      --keep-until-expiring \
      -d defaultstack.online \
      -d '*.defaultstack.online'
    ;;
  *)
    printf '%s\n' "Gebruik: sudo bash deploy/tls/obtain-wildcard-dns01.sh manual|cloudflare" >&2
    exit 1
    ;;
esac

bash "${script_dir}/relink-certs.sh"
nginx -t
bash "${script_dir}/../nginx/reload.sh"
printf '%s\n' "Wildcard-certificaat is gekoppeld. Nieuwe subdomeinen hebben geen extra certificaat nodig."
