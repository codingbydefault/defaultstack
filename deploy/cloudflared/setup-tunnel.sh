#!/usr/bin/env bash
# Installeer cloudflared, maak tunnel "defaultstack" en start de systemd-service.
# Draai dit op de thuisserver, nadat de Cloudflare-zone Active is:
#   sudo bash deploy/cloudflared/setup-tunnel.sh
#
# Het script toont nooit de inhoud van cert.pem of het tunnel-credentials-JSON.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  printf '%s\n' "Gebruik sudo: sudo bash deploy/cloudflared/setup-tunnel.sh" >&2
  exit 1
fi

export HOME=/root
umask 077

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cred_dir="/root/.cloudflared"
placeholder="00000000-0000-0000-0000-000000000000"

case "$cred_dir" in
  "$repo_root"|"$repo_root"/*)
    printf '%s\n' "Stop. Tunnelbestanden mogen niet in de git-clone staan." >&2
    exit 1
    ;;
esac

install -d -m 700 "$cred_dir"
install -d -m 755 /etc/cloudflared

install_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then
    printf 'cloudflared is aanwezig: %s\n' "$(cloudflared --version | head -n 1)"
    return
  fi
  printf '%s\n' "cloudflared installeren uit de apt-repo van Cloudflare."
  install -d -m 755 /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg -o /usr/share/keyrings/cloudflare-main.gpg
  printf '%s\n' 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' \
    >/etc/apt/sources.list.d/cloudflared.list
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y cloudflared
}

ensure_python() {
  if command -v python3 >/dev/null 2>&1; then
    return
  fi
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y python3
}

redact_log() {
  local file="$1"
  grep -vE 'TunnelSecret|AccountTag|^[[:space:]]*[{[]' "$file" || true
}

install_cloudflared
ensure_python

if [[ ! -s "${cred_dir}/cert.pem" ]]; then
  printf '%s\n' "Log in via de browser. cert.pem blijft in ${cred_dir} en wordt niet getoond."
  cloudflared tunnel login
fi

if [[ ! -s "${cred_dir}/cert.pem" ]]; then
  printf '%s\n' "Login mislukt. cert.pem ontbreekt." >&2
  exit 1
fi
chmod 600 "${cred_dir}/cert.pem"

list_out="$(mktemp)"
list_err="$(mktemp)"
tunnel_id=""
if cloudflared tunnel list -o json >"$list_out" 2>"$list_err"; then
  tunnel_id="$(python3 - "$list_out" <<'PY'
import json
import sys

try:
    with open(sys.argv[1], encoding="utf-8") as handle:
        data = json.load(handle)
except json.JSONDecodeError:
    sys.exit(0)
if isinstance(data, dict):
    data = data.get("result") or data.get("tunnels") or []
if not isinstance(data, list):
    sys.exit(0)
for item in data:
    if not isinstance(item, dict):
        continue
    if item.get("name") == "defaultstack" and not item.get("deleted_at"):
        print(item.get("id") or "")
        break
PY
)"
else
  printf '%s\n' "Tunnel-lijst ophalen mislukt." >&2
  redact_log "$list_err" >&2
fi
rm -f "$list_out" "$list_err"

if [[ -z "$tunnel_id" ]]; then
  create_out="$(mktemp)"
  if ! cloudflared tunnel create defaultstack >"$create_out" 2>&1; then
    printf '%s\n' "Tunnel aanmaken mislukt. Credentials worden niet getoond." >&2
    redact_log "$create_out" >&2
    rm -f "$create_out"
    exit 1
  fi
  tunnel_id="$(sed -n 's/.*with id \([0-9a-f-]\{36\}\).*/\1/p' "$create_out" | head -n 1)"
  rm -f "$create_out"
fi

if [[ ! "$tunnel_id" =~ ^[0-9a-fA-F-]{36}$ ]]; then
  printf '%s\n' "Geen tunnel-id voor defaultstack." >&2
  exit 1
fi

cred_file="${cred_dir}/${tunnel_id}.json"
if [[ ! -s "$cred_file" ]]; then
  printf '%s\n' "Credentialbestand voor deze tunnel ontbreekt. Inhoud wordt niet getoond." >&2
  printf '%s\n' "Staat de tunnel er al zonder lokaal bestand, verwijder hem in Cloudflare en draai dit script opnieuw." >&2
  exit 1
fi
chmod 600 "$cred_file"

config_tmp="$(mktemp)"
sed "s/${placeholder}/${tunnel_id}/g" "${repo_root}/deploy/cloudflared/config.yml" >"$config_tmp"
install -m 644 "$config_tmp" /etc/cloudflared/config.yml
rm -f "$config_tmp"

route_dns() {
  local hostname="$1"
  local route_out
  route_out="$(mktemp)"
  if ! cloudflared tunnel route dns --overwrite-dns defaultstack "$hostname" >"$route_out" 2>&1; then
    printf 'DNS-route voor %s mislukt.\n' "$hostname" >&2
    redact_log "$route_out" >&2
    rm -f "$route_out"
    exit 1
  fi
  redact_log "$route_out"
  rm -f "$route_out"
}

route_dns "www.defaultstackr.online"
route_dns "defaultstackr.online"
route_dns "api.defaultstackr.online"
route_dns "*.defaultstackr.online"

cloudflared --config /etc/cloudflared/config.yml tunnel ingress validate

if [[ -d /run/systemd/system ]]; then
  cloudflared --config /etc/cloudflared/config.yml service install
  systemctl enable cloudflared
  systemctl restart cloudflared
  printf '%s\n' "systemd-service cloudflared is actief."
else
  printf '%s\n' "Geen systemd. Start met: cloudflared --config /etc/cloudflared/config.yml tunnel run"
fi

printf '%s\n' "Tunnel defaultstack wijst naar Nginx op http://127.0.0.1:80."
printf '%s\n' "Zet in Cloudflare bij SSL/TLS de modus op Full."
printf '%s\n' "cert.pem en het credentials-JSON blijven in ${cred_dir} en horen niet in git."
