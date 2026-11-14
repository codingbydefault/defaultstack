#!/usr/bin/env bash
# Let's Encrypt via HTTP-01 voor apex, www en api. Dit is het pad voor maandag.
# Een wildcard (*.defaultstackr.online) kan HTTP-01 niet uitgeven; zie obtain-wildcard-dns01.sh.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  printf '%s\n' "Gebruik sudo: sudo bash deploy/tls/obtain-http01.sh" >&2
  exit 1
fi

email="${CERTBOT_EMAIL:-codedbydefault@gmail.com}"
webroot="/var/www/certbot"
cert="/etc/letsencrypt/live/defaultstackr.online/fullchain.pem"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

install -d -m 755 "$webroot"

names_ok() {
  local san
  [[ -f "$cert" ]] || return 1
  san="$(openssl x509 -in "$cert" -noout -ext subjectAltName 2>/dev/null || true)"
  [[ "$san" == *"DNS:defaultstackr.online"* ]] || return 1
  [[ "$san" == *"DNS:www.defaultstackr.online"* ]] || return 1
  [[ "$san" == *"DNS:api.defaultstackr.online"* ]] || return 1
}

if names_ok; then
  printf '%s\n' "Let's Encrypt-certificaat voor apex, www en api is al aanwezig."
else
  args=(
    certbot certonly --webroot -w "$webroot"
    --non-interactive --agree-tos --email "$email"
    --cert-name defaultstackr.online
    -d defaultstackr.online
    -d www.defaultstackr.online
    -d api.defaultstackr.online
  )
  if [[ -f "$cert" ]]; then
    args+=(--expand)
  fi
  "${args[@]}"
fi

bash "${script_dir}/relink-certs.sh"
nginx -t
bash "${script_dir}/../nginx/reload.sh"
printf '%s\n' "HTTP-01 certificaat staat klaar voor defaultstackr.online, www en api."
