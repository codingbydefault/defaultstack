#!/usr/bin/env bash
set -Eeuo pipefail
[[ $(id -u) -eq 0 ]] || { echo 'Use sudo bash deploy/router/manage.sh install|register <name> <port>' >&2; exit 1; }
command -v nginx >/dev/null
command -v python3 >/dev/null
command -v flock >/dev/null
exec 9>/run/lock/defaultstackr-router.lock
flock -w 30 9
root=/etc/nginx/defaultstackr-apps
config=/etc/nginx/conf.d/defaultstackr-apps.conf
mkdir -p "$root"
action="${1:-}"
case "$action" in
install)
  if [[ -f "$config" ]] && ! head -n 1 "$config" | grep -q '^# DefaultStackr managed'; then echo 'Refusing to overwrite an unmanaged config.' >&2; exit 1; fi
  [[ -f "$root/routes.map" ]] || printf '# DefaultStackr app routes\n' > "$root/routes.map"
  backup="$(mktemp)"
  existed=false
  if [[ -f "$config" ]]; then cp -p "$config" "$backup"; existed=true; fi
  ok=false
  restore() {
    if ! $ok; then
      if $existed; then cp -p "$backup" "$config"; else rm -f "$config"; fi
      nginx -t && nginx -s reload || true
    fi
    rm -f "$backup"
  }
  trap restore EXIT
  cp "$(dirname "${BASH_SOURCE[0]}")/apps.conf" "$config"
  chmod 644 "$config" "$root/routes.map"
  nginx -t
  nginx -s reload
  install -d -m 755 /var/log/nginx
  touch /var/log/nginx/defaultstackr-apps.jsonl
  chown www-data:adm /var/log/nginx/defaultstackr-apps.jsonl
  chmod 640 /var/log/nginx/defaultstackr-apps.jsonl
  ok=true
  if [[ -d /etc/logrotate.d && ! -e /etc/logrotate.d/defaultstackr-apps ]]; then
    install -m 644 "$(dirname "${BASH_SOURCE[0]}")/logrotate.conf" /etc/logrotate.d/defaultstackr-apps
  fi
  echo 'Application router installed on 127.0.0.1:8088. Existing tunnel routes unchanged.'
  ;;
register)
  name="${2:-}"
  port="${3:-}"
  [[ "$name" =~ ^[a-z][a-z0-9-]{0,39}$ && "$name" != *-previous && "$name" != *-check-* ]] || { echo 'Invalid app name.' >&2; exit 1; }
  case "$name" in www|api|app|auth|admin|ssh|mail) echo 'Reserved app name.' >&2; exit 1;; esac
  [[ "$port" =~ ^32[0-9]{2}$ ]] || { echo 'Use app port 3200-3299.' >&2; exit 1; }
  [[ -f "$config" && -f "$root/routes.map" ]] || { echo 'Install the app router first.' >&2; exit 1; }
  curl --fail --silent --max-time 5 "http://127.0.0.1:$port/healthz" >/dev/null
  backup="$(mktemp)"
  cp -p "$root/routes.map" "$backup"
  ok=false
  restore() {
    if ! $ok; then cp -p "$backup" "$root/routes.map"; nginx -t && nginx -s reload || true; fi
    rm -f "$backup"
  }
  trap restore EXIT
  python3 - "$root/routes.map" "$name" "$port" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); hostname=sys.argv[2]+'.defaultstackr.cloud'; port=sys.argv[3]
lines=[line for line in p.read_text().splitlines() if not line.split() or line.split()[0]!=hostname]
for line in lines:
    fields=line.split()
    if len(fields)==2 and fields[1]=='127.0.0.1:'+port+';' and fields[0]!=hostname:
        raise SystemExit('Port already assigned to another app')
lines.append(hostname+' 127.0.0.1:'+port+';')
p.write_text('\n'.join(lines)+'\n')
PY
  nginx -t
  nginx -s reload
  # Nginx reload is asynchronous: give new workers time to accept the route.
  routed=false
  for attempt in {1..10}; do
    if curl --fail --silent --max-time 3 -H "Host: $name.defaultstackr.cloud" http://127.0.0.1:8088/healthz >/dev/null; then routed=true; break; fi
    sleep 1
  done
  $routed || { echo 'New route failed local health check; restoring map.' >&2; exit 1; }
  ok=true
  echo "Route registered: $name.defaultstackr.cloud -> 127.0.0.1:$port"
  ;;
*) echo 'Use: sudo bash deploy/router/manage.sh install | register <name> <port>' >&2; exit 1;;
esac
