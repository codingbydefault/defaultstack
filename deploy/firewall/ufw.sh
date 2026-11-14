#!/usr/bin/env bash
# Alleen SSH, HTTP en HTTPS van buitenaf. PostgreSQL blijft op localhost.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  printf '%s\n' "Gebruik sudo: sudo bash deploy/firewall/ufw.sh" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

if ! command -v ufw >/dev/null 2>&1 || ! command -v ss >/dev/null 2>&1; then
  apt-get update
  apt-get install -y ufw iproute2
fi

allow_ssh_ports() {
  local file port
  local -A seen=()
  local nullglob_was=0
  allow_one() {
    local p="$1"
    [[ "$p" =~ ^[0-9]+$ ]] || return 0
    [[ -n "${seen[$p]:-}" ]] && return 0
    seen[$p]=1
    ufw allow "${p}/tcp" comment 'SSH'
    printf '%s\n' "SSH toegestaan op poort ${p}."
  }
  if [[ -n "${SSH_PORT:-}" ]]; then
    allow_one "$SSH_PORT"
    allow_one 22
    return
  fi
  allow_one 22
  shopt -q nullglob && nullglob_was=1
  shopt -s nullglob
  for file in /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf; do
    [[ -f "$file" ]] || continue
    while read -r port; do
      allow_one "$port"
    done < <(awk '/^[[:space:]]*Port[[:space:]]+[0-9]+/ {print $2}' "$file")
  done
  if [[ "$nullglob_was" -eq 0 ]]; then
    shopt -u nullglob
  fi
}

ufw default deny incoming
ufw default allow outgoing
allow_ssh_ports
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw deny 5432/tcp comment 'PostgreSQL alleen lokaal'
ufw deny 3000/tcp comment 'Express alleen via Nginx'
ufw deny 3100/tcp comment 'Next alleen via Nginx'
ufw --force enable
ufw status verbose

lock_postgres() {
  local conf
  local changed=0
  local nullglob_was=0
  shopt -q nullglob && nullglob_was=1
  shopt -s nullglob
  for conf in /etc/postgresql/*/main/postgresql.conf; do
    if grep -Eq "^[[:space:]]*listen_addresses[[:space:]]*=[[:space:]]*['\"]localhost['\"][[:space:]]*(#.*)?$" "$conf"; then
      printf '%s\n' "PostgreSQL luistert in ${conf} al alleen op localhost."
      continue
    fi
    if grep -Eq "^[[:space:]]*listen_addresses[[:space:]]*=" "$conf"; then
      sed -i.bak -E "s/^[[:space:]]*listen_addresses[[:space:]]*=.*/listen_addresses = 'localhost'/" "$conf"
      changed=1
      printf '%s\n' "listen_addresses in ${conf} gezet op localhost (backup: ${conf}.bak)."
    else
      printf '%s\n' "Geen actieve listen_addresses in ${conf}. Ubuntu-standaard is localhost."
    fi
  done
  if [[ "$nullglob_was" -eq 0 ]]; then
    shopt -u nullglob
  fi

  if [[ "$changed" -eq 1 ]]; then
    if systemctl is-active --quiet postgresql; then
      systemctl restart postgresql
      printf '%s\n' "PostgreSQL herstart zodat listen_addresses ingaat."
    fi
  fi
}

postgres_is_public() {
  local addr
  local found=1
  while read -r addr; do
    [[ -n "$addr" ]] || continue
    found=0
    if [[ "$addr" == "127.0.0.1:5432" || "$addr" == "[::1]:5432" ]]; then
      continue
    fi
    printf '%s\n' "PostgreSQL luistert publiek op ${addr}." >&2
    return 0
  done < <(ss -lntH | awk '{print $4}' | grep -E ':5432$' || true)
  [[ "$found" -eq 0 ]] || printf '%s\n' "Geen proces op poort 5432. Zodra PostgreSQL er is: alleen localhost."
  return 1
}

lock_postgres

if postgres_is_public; then
  printf '%s\n' "Stop. PostgreSQL mag niet op 0.0.0.0 of een publiek adres luisteren." >&2
  printf '%s\n' "Pakket-installatie: listen_addresses = 'localhost' in postgresql.conf, daarna systemctl restart postgresql." >&2
  printf '%s\n' "Docker: publiceer 127.0.0.1:5432:5432, nooit 5432:5432." >&2
  exit 1
fi

warn_local_only() {
  local port="$1"
  local label="$2"
  local addr
  while read -r addr; do
    [[ -n "$addr" ]] || continue
    if [[ "$addr" == "127.0.0.1:${port}" || "$addr" == "[::1]:${port}" ]]; then
      continue
    fi
    printf '%s\n' "Let op: ${label} luistert op ${addr}. Zet de bind op 127.0.0.1. UFW blokkeert de poort, maar localhost is veiliger." >&2
  done < <(ss -lntH | awk '{print $4}' | grep -E ":${port}$" || true)
}

warn_local_only 3000 "Express"
warn_local_only 3100 "Next.js"
printf '%s\n' "Firewall staat aan: alleen 22, 80 en 443 binnen."
