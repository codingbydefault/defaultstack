#!/usr/bin/env bash
# Update only existing DefaultStackr proxy files; no DNS, firewall or credentials changes.
set -Eeuo pipefail
[[ "$(id -u)" -eq 0 ]] || { echo 'Usage: sudo bash deploy/sync-domain.sh' >&2; exit 1; }
command -v python3 >/dev/null || { echo 'python3 is required.' >&2; exit 1; }
backup="$(mktemp -d /var/backups/defaultstack-domain-XXXXXXXX)"
chmod 700 "$backup"
files=(/etc/nginx/sites-available/defaultstack.conf /etc/nginx/sites-available/defaultstackr.conf /etc/nginx/defaultstack/wildcard.conf /etc/nginx/defaultstackr/wildcard.conf /etc/nginx/defaultstack/subdomains.map /etc/nginx/defaultstackr/subdomains.map /etc/nginx/defaultstack/proxy-params.conf /etc/nginx/defaultstackr/proxy-params.conf /etc/nginx/defaultstack/proxy-params-tunnel.conf /etc/nginx/defaultstackr/proxy-params-tunnel.conf /etc/cloudflared/config.yml)
changed=()
nginx_changed=false
tunnel_changed=false
committed=false
restore() {
  local result=$?
  trap - EXIT INT TERM
  if ! $committed; then
    for file in "${changed[@]}"; do cp -p "$backup$file" "$file"; done
    if $nginx_changed; then nginx -t && systemctl reload nginx || true; fi
    if $tunnel_changed && systemctl is-active --quiet cloudflared; then systemctl restart cloudflared || true; fi
    echo "Update failed or interrupted. Original files restored from $backup" >&2
  fi
  return "$result"
}
trap restore EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
for file in "${files[@]}"; do
  [[ -f "$file" ]] || continue
  if grep -Eq 'defaultstack\.online|defaultstackr\.cloud' "$file"; then
    # Copy resolved contents, preserving permissions; credentials are never printed.
    mkdir -p "$backup$(dirname "$file")"
    cp -pL "$file" "$backup$file"
    changed+=("$file")
    python3 - "$file" <<'PY'
import pathlib, re, sys
p = pathlib.Path(sys.argv[1])
s = p.read_text()
s = re.sub(r'(?<![a-zA-Z0-9_-])(?:defaultstack\.online|defaultstackr\.cloud)(?![a-zA-Z0-9_.-])', 'defaultstackr.online', s)
p.write_text(s)
PY
    case "$file" in /etc/nginx/*) nginx_changed=true;; /etc/cloudflared/*) tunnel_changed=true;; esac
  fi
done
if $nginx_changed; then
  command -v nginx >/dev/null
  nginx -t
fi
if $tunnel_changed; then
  command -v cloudflared >/dev/null
  cloudflared --config /etc/cloudflared/config.yml tunnel ingress validate
fi
if $nginx_changed; then systemctl reload nginx; fi
if $tunnel_changed; then
  if systemctl is-active --quiet cloudflared; then systemctl restart cloudflared;
  else echo 'NOTICE: cloudflared is not active. Configuration updated; service not started.'; fi
fi
committed=true
printf 'Canonical domain: defaultstackr.online\nUpdated files: %s\nBackup: %s\n' "${#changed[@]}" "$backup"
echo 'DNS/Cloudflare zone routes and TLS certificates are not changed by this script.'
echo 'If the old configuration used HTTPS origin certificates, issue certificates for the new domain before public use.'
