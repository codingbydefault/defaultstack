#!/usr/bin/env bash
# Voeg één subdomein toe en herlaad Nginx.
# Gebruik: sudo bash deploy/nginx/add-subdomain.sh demo 3200
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  printf '%s\n' "Gebruik sudo: sudo bash deploy/nginx/add-subdomain.sh <naam> <poort>" >&2
  exit 1
fi

name="${1:-}"
port="${2:-}"
if [[ -z "$name" || -z "$port" ]]; then
  printf '%s\n' "Gebruik: sudo bash deploy/nginx/add-subdomain.sh <naam> <poort>" >&2
  printf '%s\n' "Voorbeeld: sudo bash deploy/nginx/add-subdomain.sh demo 3200" >&2
  exit 1
fi

if [[ ! "$name" =~ ^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$ ]]; then
  printf '%s\n' "Ongeldige naam. Gebruik kleine letters, cijfers en koppeltekens." >&2
  exit 1
fi

case "$name" in
  www|api)
    printf '%s\n' "www en api zijn gereserveerd." >&2
    exit 1
    ;;
esac

if [[ ! "$port" =~ ^[0-9]+$ ]] || [[ "$port" -lt 1 || "$port" -gt 65535 ]]; then
  printf '%s\n' "Ongeldige poort." >&2
  exit 1
fi

case "$port" in
  22|80|443|3000|3100|5432)
    printf '%s\n' "Poort ${port} is gereserveerd (SSH, HTTP, HTTPS, Express, Next of PostgreSQL)." >&2
    exit 1
    ;;
esac

map_file="/etc/nginx/defaultstackr/subdomains.map"
if [[ ! -f "$map_file" ]]; then
  printf '%s\n' "Mapbestand ontbreekt. Draai eerst: sudo bash deploy/setup.sh" >&2
  exit 1
fi

if grep -qE "^${name}\\.defaultstackr\\.online[[:space:]]" "$map_file"; then
  printf '%s\n' "Subdomein ${name} staat al in ${map_file}." >&2
  exit 1
fi

backup="$(mktemp)"
cp "$map_file" "$backup"
trap 'rm -f "$backup"' EXIT
printf '%s\n' "${name}.defaultstackr.cloud 127.0.0.1:${port};" >>"$map_file"
if ! nginx -t || ! nginx -s reload; then
  cp "$backup" "$map_file"
  if nginx -t; then
    nginx -s reload || echo 'Herladen na herstel is mislukt.' >&2
  fi
  echo 'Routing failed; previous subdomain map restored.' >&2
  exit 1
fi
printf '%s\n' "https://${name}.defaultstackr.cloud wijst nu naar 127.0.0.1:${port}."
printf '%s\n' "Start die app alleen op 127.0.0.1, niet op 0.0.0.0."
