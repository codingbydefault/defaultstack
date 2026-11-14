#!/usr/bin/env bash
# Herlaad Nginx. Op Ubuntu via systemd; zonder systemd rechtstreeks.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  printf '%s\n' "Gebruik sudo: sudo bash deploy/nginx/reload.sh" >&2
  exit 1
fi

action="${1:-reload}"

nginx_running() {
  [[ -f /run/nginx.pid ]] || return 1
  kill -0 "$(cat /run/nginx.pid)" 2>/dev/null
}

if [[ -d /run/systemd/system ]] && command -v systemctl >/dev/null 2>&1; then
  systemctl enable nginx
  if [[ "$action" == "restart" ]] || ! systemctl is-active --quiet nginx; then
    systemctl restart nginx
  else
    systemctl reload nginx
  fi
  exit 0
fi

# Een reload kan 127.0.0.1:80 niet binden zolang 0.0.0.0:80 nog open is.
if [[ "$action" == "restart" ]] && nginx_running; then
  nginx -s quit
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
    nginx_running || break
    sleep 0.1
  done
  if nginx_running; then
    nginx -s stop || true
    sleep 0.2
  fi
fi

if nginx_running && [[ "$action" != "restart" ]]; then
  nginx -s reload
else
  nginx
fi
