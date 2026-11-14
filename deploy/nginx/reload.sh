#!/usr/bin/env bash
# Herlaad Nginx. Op Ubuntu via systemd; zonder systemd rechtstreeks.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  printf '%s\n' "Gebruik sudo: sudo bash deploy/nginx/reload.sh" >&2
  exit 1
fi

if [[ -d /run/systemd/system ]] && command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet nginx; then
    systemctl reload nginx
  else
    systemctl enable nginx
    systemctl start nginx
  fi
  exit 0
fi

if [[ -f /run/nginx.pid ]] && kill -0 "$(cat /run/nginx.pid)" 2>/dev/null; then
  nginx -s reload
else
  nginx
fi
