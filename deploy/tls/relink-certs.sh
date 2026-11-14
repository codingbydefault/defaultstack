#!/usr/bin/env bash
# Wijs de Nginx-certificaatpaden naar het beste beschikbare certificaat.
# Volgorde apex/www/api: Let's Encrypt, anders Cloudflare-origin, anders self-signed.
# Volgorde wildcard: Let's Encrypt-wildcard, anders Cloudflare-origin, anders self-signed.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  printf '%s\n' "Gebruik sudo: sudo bash deploy/tls/relink-certs.sh" >&2
  exit 1
fi

nginx_dir="/etc/nginx/defaultstack"
le_apex="/etc/letsencrypt/live/defaultstack.online"
le_wild="/etc/letsencrypt/live/defaultstack.online-wildcard"
origin="${nginx_dir}/origin"
selfsigned="${nginx_dir}/selfsigned"

if [[ ! -f "${selfsigned}/fullchain.pem" || ! -f "${selfsigned}/privkey.pem" ]]; then
  printf '%s\n' "Tijdelijk self-signed certificaat ontbreekt. Draai eerst deploy/setup.sh." >&2
  exit 1
fi

pick_main() {
  if [[ -f "${le_apex}/fullchain.pem" && -f "${le_apex}/privkey.pem" ]]; then
    printf '%s\n' "$le_apex"
  elif [[ -f "${origin}/fullchain.pem" && -f "${origin}/privkey.pem" ]]; then
    printf '%s\n' "$origin"
  else
    printf '%s\n' "$selfsigned"
  fi
}

pick_wild() {
  if [[ -f "${le_wild}/fullchain.pem" && -f "${le_wild}/privkey.pem" ]]; then
    printf '%s\n' "$le_wild"
  elif [[ -f "${origin}/fullchain.pem" && -f "${origin}/privkey.pem" ]]; then
    printf '%s\n' "$origin"
  else
    printf '%s\n' "$selfsigned"
  fi
}

link_pair() {
  local dest_dir="$1"
  local src_dir="$2"
  local label="$3"
  install -d -m 755 "$dest_dir"
  ln -sfn "${src_dir}/fullchain.pem" "${dest_dir}/fullchain.pem"
  ln -sfn "${src_dir}/privkey.pem" "${dest_dir}/privkey.pem"
  printf '%s -> %s\n' "$label" "$src_dir"
}

main_src="$(pick_main)"
wild_src="$(pick_wild)"
link_pair "${nginx_dir}/certs" "$main_src" "apex+www+api"
link_pair "${nginx_dir}/certs/wildcard" "$wild_src" "wildcard"
