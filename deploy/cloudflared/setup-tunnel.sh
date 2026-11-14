#!/usr/bin/env bash
# Installeer cloudflared, maak tunnel "defaultstackr" en start de systemd-service.
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

# JSON-lijst, platte tabel, of `tunnel info`. Leeg als de naam ontbreekt.
lookup_tunnel_id() {
  local source="$1"
  python3 - "$source" <<'PY'
import json
import re
import sys

uuid_re = re.compile(
    r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
)
text = open(sys.argv[1], encoding="utf-8", errors="replace").read()

def from_obj(obj):
    if isinstance(obj, dict):
        name = obj.get("name") or obj.get("Name")
        tunnel_id = obj.get("id") or obj.get("ID")
        deleted = obj.get("deleted_at") or obj.get("deletedAt")
        if name == "defaultstackr" and tunnel_id and not deleted:
            return str(tunnel_id)
        for key in ("result", "tunnels", "tunnel"):
            if key in obj:
                found = from_obj(obj[key])
                if found:
                    return found
    elif isinstance(obj, list):
        for item in obj:
            found = from_obj(item)
            if found:
                return found
    return ""

found = ""
decoder = json.JSONDecoder()
for index, char in enumerate(text):
    if char not in "{[":
        continue
    try:
        parsed, _ = decoder.raw_decode(text[index:])
    except json.JSONDecodeError:
        continue
    found = from_obj(parsed)
    if found:
        break

if not found:
    for line in text.splitlines():
        parts = line.split()
        if len(parts) >= 2 and parts[1] == "defaultstackr" and uuid_re.fullmatch(parts[0]):
            found = parts[0]
            break
        if re.search(r"\bdefaultstackr\b", line):
            match = uuid_re.search(line)
            if match:
                found = match.group(0)
                break

if not found and re.search(r"\bdefaultstackr\b", text):
    match = re.search(r"(?i)\bID\b[:\s|]+(" + uuid_re.pattern + ")", text)
    if match:
        found = match.group(1)

if found:
    print(found)
PY
}

read_tunnel_id() {
  local command_out="$1"
  local command_err="$2"
  shift 2
  if "$@" >"$command_out" 2>"$command_err"; then
    lookup_tunnel_id "$command_out"
    return 0
  fi
  # info kan de id printen en toch een foutcode geven als er geen connector is.
  cat "$command_err" >>"$command_out"
  lookup_tunnel_id "$command_out"
}

tunnel_id=""
list_out="$(mktemp)"
list_err="$(mktemp)"
tunnel_id="$(read_tunnel_id "$list_out" "$list_err" cloudflared tunnel list -o json || true)"
if [[ -z "$tunnel_id" ]]; then
  : >"$list_out"
  tunnel_id="$(read_tunnel_id "$list_out" "$list_err" cloudflared tunnel list || true)"
fi
if [[ -z "$tunnel_id" ]]; then
  : >"$list_out"
  tunnel_id="$(read_tunnel_id "$list_out" "$list_err" cloudflared tunnel info defaultstackr -o json || true)"
fi
if [[ -z "$tunnel_id" ]]; then
  : >"$list_out"
  tunnel_id="$(read_tunnel_id "$list_out" "$list_err" cloudflared tunnel info defaultstackr || true)"
fi
rm -f "$list_out" "$list_err"

if [[ -z "$tunnel_id" ]]; then
  create_out="$(mktemp)"
  info_out="$(mktemp)"
  info_err="$(mktemp)"
  if ! cloudflared tunnel create defaultstackr >"$create_out" 2>&1; then
    if grep -qi 'already exists' "$create_out"; then
      tunnel_id="$(read_tunnel_id "$info_out" "$info_err" cloudflared tunnel info defaultstackr || true)"
    fi
    if [[ -z "$tunnel_id" ]]; then
      printf '%s\n' "Tunnel aanmaken mislukt. Credentials worden niet getoond." >&2
      redact_log "$create_out" >&2
      rm -f "$create_out" "$info_out" "$info_err"
      exit 1
    fi
  else
    tunnel_id="$(sed -n 's/.*with id \([0-9a-fA-F-]\{36\}\).*/\1/p' "$create_out" | head -n 1)"
  fi
  rm -f "$create_out" "$info_out" "$info_err"
fi

if [[ ! "$tunnel_id" =~ ^[0-9a-fA-F-]{36}$ ]]; then
  printf '%s\n' "Geen tunnel-id voor defaultstackr." >&2
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
  if cloudflared tunnel route dns --overwrite-dns defaultstackr "$hostname" >"$route_out" 2>&1; then
    redact_log "$route_out"
    rm -f "$route_out"
    return 0
  fi
  if grep -q '1003' "$route_out"; then
    printf 'DNS-route voor %s is niet gezet. Cloudflare-code 1003.\n' "$hostname" >&2
    if [[ "$hostname" == "defaultstackr.cloud" ]]; then
      cat <<'EOF' >&2
De apex heeft meerdere A-records. Cloudflare vervangt die niet vanzelf.
Open het Cloudflare-dashboard → DNS → Records voor defaultstackr.cloud.
Verwijder daar alle A- en AAAA-records op de naam @ (defaultstackr.cloud).
Een CNAME van @ naar deze tunnel mag blijven staan.
www, api en * gaan hierna gewoon door. Draai dit script daarna opnieuw voor de apex.
EOF
    else
      printf 'Verwijder in DNS → Records het extra A-, AAAA- of CNAME-record voor %s en draai het script opnieuw.\n' "$hostname" >&2
    fi
    rm -f "$route_out"
    return 0
  fi
  printf 'DNS-route voor %s mislukt.\n' "$hostname" >&2
  redact_log "$route_out" >&2
  rm -f "$route_out"
  exit 1
}

route_dns "www.defaultstackr.cloud"
route_dns "defaultstackr.cloud"
route_dns "api.defaultstackr.cloud"
route_dns "*.defaultstackr.cloud"

cloudflared --config /etc/cloudflared/config.yml tunnel ingress validate

if [[ -d /run/systemd/system ]]; then
  unit="/etc/systemd/system/cloudflared.service"
  if [[ -f "$unit" ]]; then
    if grep -q '/etc/cloudflared/config.yml' "$unit"; then
      systemctl daemon-reload
      systemctl enable cloudflared
      systemctl restart cloudflared
      printf '%s\n' "Bestaande cloudflared-service gebruikt al /etc/cloudflared/config.yml. Herstart."
    else
      cat <<'EOF' >&2
Er staat al /etc/systemd/system/cloudflared.service, maar die gebruikt niet
/etc/cloudflared/config.yml. Dat is meestal een oude dashboard-tunnel met een token.
Die service is niet gewijzigd.

Kies één weg en draai dit script daarna opnieuw:
  sudo cloudflared service uninstall
of verwijder de oude tunnel in Cloudflare (Zero Trust → Tunnels) en daarna:
  sudo rm /etc/systemd/system/cloudflared.service
  sudo systemctl daemon-reload
EOF
      exit 1
    fi
  else
    cloudflared --config /etc/cloudflared/config.yml service install
    systemctl enable cloudflared
    systemctl restart cloudflared
    printf '%s\n' "systemd-service cloudflared is actief."
  fi
else
  printf '%s\n' "Geen systemd. Start met: cloudflared --config /etc/cloudflared/config.yml tunnel run"
fi

printf '%s\n' "Tunnel defaultstackr wijst naar Nginx op http://127.0.0.1:80."
printf '%s\n' "Zet in Cloudflare bij SSL/TLS de modus op Full."
printf '%s\n' "cert.pem en het credentials-JSON blijven in ${cred_dir} en horen niet in git."
