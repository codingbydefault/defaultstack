#!/usr/bin/env bash
# Kopieer de Nginx-config naar /etc en herlaad als de test slaagt.
# Het subdomeinbestand wordt alleen aangemaakt als het nog niet bestaat.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  printf '%s\n' "Gebruik sudo: sudo bash deploy/nginx/install-config.sh" >&2
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
nginx_dir="/etc/nginx/defaultstack"
prev="${nginx_dir}/previous"
backup_made=0

install -d -m 755 "$nginx_dir" "${nginx_dir}/certs/wildcard" "${nginx_dir}/origin" "$prev"
install -d -m 755 /var/www/certbot /var/www/defaultstack-errors

save_prev() {
  local name="$1"
  local path="$2"
  if [[ -f "$path" && ! -L "$path" ]]; then
    install -m 644 "$path" "${prev}/${name}"
    backup_made=1
  fi
}

restore_prev() {
  [[ "$backup_made" -eq 1 ]] || return 0
  [[ -f "${prev}/defaultstack.conf" ]] && install -m 644 "${prev}/defaultstack.conf" /etc/nginx/sites-available/defaultstack.conf
  [[ -f "${prev}/wildcard.conf" ]] && install -m 644 "${prev}/wildcard.conf" "${nginx_dir}/wildcard.conf"
  [[ -f "${prev}/ssl-params.conf" ]] && install -m 644 "${prev}/ssl-params.conf" "${nginx_dir}/ssl-params.conf"
  [[ -f "${prev}/proxy-params.conf" ]] && install -m 644 "${prev}/proxy-params.conf" "${nginx_dir}/proxy-params.conf"
  printf '%s\n' "Nginx-test mislukt. Vorige config teruggezet." >&2
}

save_prev "defaultstack.conf" /etc/nginx/sites-available/defaultstack.conf
save_prev "wildcard.conf" "${nginx_dir}/wildcard.conf"
save_prev "ssl-params.conf" "${nginx_dir}/ssl-params.conf"
save_prev "proxy-params.conf" "${nginx_dir}/proxy-params.conf"

install -m 644 "${script_dir}/defaultstack.conf" /etc/nginx/sites-available/defaultstack.conf
install -m 644 "${script_dir}/wildcard.conf" "${nginx_dir}/wildcard.conf"
install -m 644 "${script_dir}/ssl-params.conf" "${nginx_dir}/ssl-params.conf"
install -m 644 "${script_dir}/proxy-params.conf" "${nginx_dir}/proxy-params.conf"
install -m 644 "${script_dir}/unknown-subdomain.html" /var/www/defaultstack-errors/unknown-subdomain.html
ln -sfn /etc/nginx/sites-available/defaultstack.conf /etc/nginx/sites-enabled/defaultstack.conf
rm -f /etc/nginx/sites-enabled/default

if [[ ! -f "${nginx_dir}/subdomains.map" ]]; then
  install -m 644 "${script_dir}/subdomains.map" "${nginx_dir}/subdomains.map"
fi

if ! nginx -t; then
  restore_prev
  nginx -t || true
  exit 1
fi

bash "${script_dir}/reload.sh"

printf '%s\n' "Nginx-config is geladen."
