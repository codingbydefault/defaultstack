#!/usr/bin/env bash
# Werkt het A-record van de apex bij naar het huidige publieke IPv4-adres.
# Bedoeld voor een thuisserver zonder vast IP. Niet gebruiken samen met een Tunnel.
#
#   sudo install -m 600 /dev/null /root/.secrets/cloudflare-ddns.env
#   # CF_API_TOKEN=... en CF_ZONE_ID=... in dat bestand
#   sudo CF_ENV_FILE=/root/.secrets/cloudflare-ddns.env bash deploy/dns/cloudflare-ddns.sh
#
# Cron, elke vijf minuten:
#   */5 * * * * root CF_ENV_FILE=/root/.secrets/cloudflare-ddns.env /var/www/defaultstack/deploy/dns/cloudflare-ddns.sh
set -euo pipefail

if [[ -n "${CF_ENV_FILE:-}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$CF_ENV_FILE"
  set +a
fi

: "${CF_API_TOKEN:?Zet CF_API_TOKEN in de omgeving of in CF_ENV_FILE.}"
: "${CF_ZONE_ID:?Zet CF_ZONE_ID in de omgeving of in CF_ENV_FILE.}"

CF_RECORD_NAME="${CF_RECORD_NAME:-defaultstack.online}"
CF_PROXIED="${CF_PROXIED:-false}"

if [[ ! "$CF_RECORD_NAME" =~ ^[A-Za-z0-9.*-]+$ ]]; then
  printf '%s\n' "Ongeldige CF_RECORD_NAME." >&2
  exit 1
fi

CF_IP="$(curl -4 -fsSL --max-time 15 https://api.ipify.org)"
export CF_API_TOKEN CF_ZONE_ID CF_RECORD_NAME CF_PROXIED CF_IP

python3 - <<'PY'
import json
import os
import urllib.request

ip = os.environ["CF_IP"].strip()
parts = ip.split(".")
if len(parts) != 4 or not all(part.isdigit() and 0 <= int(part) <= 255 for part in parts):
    raise SystemExit(f"Geen IPv4 van ipify: {ip}")

token = os.environ["CF_API_TOKEN"]
zone = os.environ["CF_ZONE_ID"]
name = os.environ["CF_RECORD_NAME"]
proxied = os.environ.get("CF_PROXIED", "false").lower() == "true"

def call(method, url, body=None):
    data = None if body is None else json.dumps(body).encode()
    request = urllib.request.Request(url, data=data, method=method)
    request.add_header("Authorization", f"Bearer {token}")
    request.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.load(response)
    if not payload.get("success"):
        raise SystemExit(json.dumps(payload.get("errors"), ensure_ascii=False))
    return payload

base = f"https://api.cloudflare.com/client/v4/zones/{zone}/dns_records"
found = call("GET", f"{base}?type=A&name={name}")
records = found.get("result") or []
if not records:
    call("POST", base, {"type": "A", "name": name, "content": ip, "ttl": 120, "proxied": proxied})
    print(f"A-record {name} aangemaakt naar {ip}.")
elif records[0]["content"] == ip and bool(records[0].get("proxied")) == proxied:
    print(f"A-record {name} staat al op {ip}.")
else:
    call("PATCH", f"{base}/{records[0]['id']}", {"content": ip, "proxied": proxied})
    print(f"A-record {name} bijgewerkt naar {ip}.")
PY
