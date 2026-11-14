#!/usr/bin/env bash
# Eerste installatie op Ubuntu 22.04 of 24.04. Opnieuw draaien is veilig.
# Standaard is Cloudflare Tunnel: geen poort 80/443 naar buiten.
#   sudo bash deploy/setup.sh
# Direct op het publieke IP, met Let's Encrypt:
#   sudo MODE=direct bash deploy/setup.sh
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  printf '%s\n' "Start met sudo, vanuit de map van de clone:" >&2
  printf '%s\n' "  sudo bash deploy/setup.sh" >&2
  exit 1
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
app_dir="${APP_DIR:-$repo_root}"

if [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
  deploy_user="$SUDO_USER"
else
  deploy_user="$(id -un)"
fi

user_home="$(getent passwd "$deploy_user" | cut -d: -f6 || true)"
if [[ -z "$user_home" ]]; then
  printf '%s\n' "Geen homemap voor gebruiker ${deploy_user}." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
umask 022

mode="${MODE:-tunnel}"
case "$mode" in
  tunnel|direct) ;;
  *)
    printf '%s\n' "MODE moet tunnel of direct zijn." >&2
    exit 1
    ;;
esac

apt_install() {
  apt-get install -y -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold "$@"
}

install_node() {
  local major=0
  if command -v node >/dev/null 2>&1; then
    major="$(node -p 'Number(process.versions.node.split(".")[0])')"
  fi
  if [[ "$major" -ge 22 ]]; then
    printf 'Node %s is aanwezig (LTS-reeks, 22 of nieuwer).\n' "$(node -v)"
    return
  fi
  printf '%s\n' "Node LTS 24.x wordt geïnstalleerd."
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt_install nodejs
  hash -r
}

allow_nginx_letsencrypt() {
  local profile="/etc/apparmor.d/usr.sbin.nginx"
  local local_profile="/etc/apparmor.d/local/usr.sbin.nginx"
  [[ -f "$profile" ]] || return 0
  install -d -m 755 /etc/apparmor.d/local
  if [[ ! -f "$local_profile" ]] || ! grep -q "/etc/letsencrypt/" "$local_profile"; then
    cat >>"$local_profile" <<'EOF'
/etc/letsencrypt/live/** r,
/etc/letsencrypt/archive/** r,
EOF
  fi
  if command -v apparmor_parser >/dev/null 2>&1; then
    apparmor_parser -r "$profile" || true
  fi
}

ensure_selfsigned() {
  local dir="/etc/nginx/defaultstack/selfsigned"
  install -d -m 750 "$dir"
  if [[ -f "${dir}/fullchain.pem" && -f "${dir}/privkey.pem" ]]; then
    return
  fi
  openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
    -keyout "${dir}/privkey.pem" \
    -out "${dir}/fullchain.pem" \
    -subj "/CN=defaultstackr.online" \
    -addext "subjectAltName=DNS:defaultstackr.online,DNS:www.defaultstackr.online,DNS:api.defaultstackr.online,DNS:*.defaultstackr.online"
  chmod 644 "${dir}/fullchain.pem"
  chmod 600 "${dir}/privkey.pem"
  printf '%s\n' "Tijdelijk self-signed certificaat gezet. Vervang het met Let's Encrypt."
}

write_renew_hook() {
  install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
  cat >/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'EOF'
#!/bin/bash
set -euo pipefail
systemctl reload nginx
EOF
  chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
}

run_as_deploy() {
  runuser -u "$deploy_user" -- env \
    HOME="$user_home" \
    PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    "$@"
}

printf 'Pakketten installeren (modus %s).\n' "$mode"
apt-get update
packages=(ca-certificates curl gnupg git nginx openssl iproute2 ufw python3)
if [[ "$mode" == "direct" ]]; then
  packages+=(certbot)
fi
apt_install "${packages[@]}"

install_node
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi
hash -r

if [[ "$deploy_user" == "root" ]]; then
  printf '%s\n' "Waarschuwing: PM2 draait als root. Log de volgende keer in als gewone gebruiker en gebruik sudo."
else
  chown -R "${deploy_user}:${deploy_user}" "$app_dir"
fi

printf '%s\n' "Next.js bouwen in ${app_dir}."
run_as_deploy npm --prefix "$app_dir" ci --include=dev
run_as_deploy npm --prefix "$app_dir" run build

if [[ "$mode" == "direct" ]]; then
  allow_nginx_letsencrypt
  ensure_selfsigned
  write_renew_hook
  bash "${app_dir}/deploy/tls/relink-certs.sh"
fi
MODE="$mode" bash "${app_dir}/deploy/nginx/install-config.sh"

cert_note=""
if [[ "$mode" == "direct" ]]; then
  cert_note="Let's Encrypt is nog niet actief. Nginx gebruikt het tijdelijke certificaat."
  if bash "${app_dir}/deploy/tls/obtain-http01.sh"; then
    cert_note="Let's Encrypt staat aan voor defaultstackr.online, www en api."
  else
    printf '%s\n' "Certbot is niet gelukt. Dat is normaal als DNS nog niet naar deze server wijst."
    printf '%s\n' "Zet daarna: sudo bash deploy/tls/obtain-http01.sh"
  fi
fi

printf '%s\n' "PM2 starten."
run_as_deploy pm2 startOrReload "${app_dir}/deploy/ecosystem.config.cjs" --update-env
run_as_deploy pm2 save
if ! env PATH="$PATH" pm2 startup systemd -u "$deploy_user" --hp "$user_home"; then
  printf '%s\n' "pm2 startup is niet gelukt. Na een reboot: pm2 startOrReload deploy/ecosystem.config.cjs"
fi

printf '%s\n' "Firewall instellen."
MODE="$mode" bash "${app_dir}/deploy/firewall/ufw.sh"

if [[ "$mode" == "tunnel" ]]; then
  cat <<EOF

Klaar (tunnel).
  Nginx luistert alleen op 127.0.0.1:80 en doet de host-routing.
  Next.js:  127.0.0.1:3100
  Express:  127.0.0.1:3000 (dit script start hem niet)
  Firewall: alleen SSH. Poort 80 en 443 blijven dicht.
  Daarna, als de Cloudflare-zone Active is:
    sudo bash deploy/cloudflared/setup-tunnel.sh
  Zet in Cloudflare bij SSL/TLS de modus op Full.

EOF
else
  cat <<EOF

Klaar (direct).
  Site:  https://www.defaultstackr.online  ->  127.0.0.1:3100
  Apex:  https://defaultstackr.online      ->  301 naar www
  API:   https://api.defaultstackr.online  ->  127.0.0.1:3000 (Express, dit script start hem niet)
  ${cert_note}
  Wildcard-TLS: sudo bash deploy/tls/obtain-wildcard-dns01.sh manual
  of, met DNS bij Cloudflare: sudo bash deploy/tls/obtain-wildcard-dns01.sh cloudflare
  Subdomein: sudo bash deploy/nginx/add-subdomain.sh demo 3200

EOF
fi
