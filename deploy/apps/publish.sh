#!/usr/bin/env bash
set -Eeuo pipefail
name="${1:-}"
source_dir="${2:-}"
port="${3:-3200}"
case "$name" in www|api|app|auth|admin|ssh|mail) echo 'Reserved app name.' >&2; exit 1;; esac
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$script_dir/deploy.sh" "$name" "$source_dir" "$port"
sudo bash "$script_dir/../router/manage.sh" register "$name" "$port"
result=0
node "$script_dir/check-publication.mjs" "$name" || result=$?
node "$script_dir/export-status.mjs"
if [[ "$result" -ne 0 ]]; then
  echo 'Container is deployed. Public access is not verified yet; check the wildcard tunnel/DNS and retry check-publication.mjs.' >&2
  exit "$result"
fi
