#!/usr/bin/env bash
set -Eeuo pipefail
[[ $(id -u) -eq 0 ]] || { echo 'Use: sudo bash deploy/apps/install-monitor.sh <deploy-user>' >&2; exit 1; }
user="${1:-}"
[[ "$user" =~ ^[a-z_][a-z0-9_-]*$ ]] && id "$user" >/dev/null || { echo 'Supply an existing deploy user.' >&2; exit 1; }
[[ "$user" != root ]] || { echo 'Use a non-root deploy user.' >&2; exit 1; }
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
node="$(command -v node)"
user_home="$(getent passwd "$user" | cut -d: -f6)"
for value in "$repo" "$node" "$user_home"; do [[ "$value" =~ ^/[a-zA-Z0-9_./-]+$ ]] || { echo 'Paths must not contain spaces or special characters.' >&2; exit 1; }; done
sudo -u "$user" "$node" --version >/dev/null
sudo -u "$user" docker info >/dev/null
state="$user_home/.local/state/defaultstack"
sudo -u "$user" mkdir -p "$state"
chmod 700 "$state"
cat > /etc/systemd/system/defaultstackr-status.service <<UNIT
[Unit]
Description=DefaultStackr read-only deployment metrics export
After=docker.service
[Service]
Type=oneshot
User=$user
WorkingDirectory=$repo
Environment=DEFAULTSTACK_STATE_DIR=$state
ExecStart=$node $repo/deploy/apps/export-status.mjs
TimeoutStartSec=45
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=$state
UNIT
cat > /etc/systemd/system/defaultstackr-status.timer <<'UNIT'
[Unit]
Description=Refresh DefaultStackr metrics every 30 seconds
[Timer]
OnBootSec=30
OnUnitActiveSec=30
AccuracySec=5
Unit=defaultstackr-status.service
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now defaultstackr-status.timer
systemctl start defaultstackr-status.service
echo 'Snapshot collection enabled every 30 seconds. Web process needs no Docker permissions.'
