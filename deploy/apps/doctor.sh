#!/usr/bin/env bash
# Read-only checks. No secrets or environment-file contents are printed.
set -uo pipefail
issues=0
check() { if "$@" >/dev/null 2>&1; then return 0; else return 1; fi; }
echo 'DefaultStackr server check (no changes)'
for tool in git node npm docker curl flock; do
  if command -v "$tool" >/dev/null; then echo "OK: $tool installed"; else echo "MISSING: $tool"; issues=$((issues+1)); fi
done
if check docker info; then
  echo 'OK: Docker accessible'
  docker info --format 'Resource support: memory={{.MemoryLimit}} pids={{.PidsLimit}}'
  echo 'Managed app containers:'
  docker ps -a --filter name=defaultstack-app- --format '  {{.Names}} | {{.Status}} | {{.Ports}}'
else
  echo 'ERROR: Docker not accessible. Check group membership/session.'; issues=$((issues+1))
fi
if check curl --fail --max-time 5 http://127.0.0.1:3100/healthz; then echo 'OK: dashboard health'; else echo 'NOTICE: dashboard not reachable on localhost:3100'; fi
if check curl --fail --max-time 5 http://127.0.0.1:3200/healthz; then echo 'OK: test app health'; else echo 'NOTICE: no healthy test app on localhost:3200'; fi
state_dir="${DEFAULTSTACK_STATE_DIR:-$HOME/.local/state/defaultstack}"
if [[ -r "$state_dir/status.json" ]]; then echo 'OK: deployment snapshot exists'; else echo 'NOTICE: export snapshot with node deploy/apps/export-status.mjs'; fi
if [[ -f .env.local ]] && grep -q '^ENABLE_LOCAL_DATABASE_EDITOR=true' .env.local; then
  echo 'NOTICE: database editor enabled. Keep this workspace private until authentication is implemented.'
fi
if [[ "$issues" -gt 0 ]]; then echo "Found $issues required setup issue(s)."; exit 1; fi
echo 'Required tools available. Health notices above may still require action.'
