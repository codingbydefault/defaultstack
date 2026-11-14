#!/usr/bin/env bash
# Trusted local source only. Never expose Docker access through an unauthenticated API.
set -Eeuo pipefail
name="${1:-}"
source_dir="${2:-}"
port="${3:-3200}"
[[ "$name" =~ ^[a-z][a-z0-9-]{0,39}$ ]] || { echo 'Usage: bash deploy/apps/deploy.sh <app-name> <source-dir> [port 3200-3299]' >&2; exit 1; }
[[ "$port" =~ ^[0-9]{4}$ ]] && (( port >= 3200 && port <= 3299 )) || { echo 'Use a port from 3200 to 3299.' >&2; exit 1; }
[[ -f "$source_dir/Dockerfile" ]] || { echo 'Source needs a Dockerfile and /healthz endpoint.' >&2; exit 1; }
for command in docker curl flock; do command -v "$command" >/dev/null || { echo "Missing: $command" >&2; exit 1; }; done
docker info >/dev/null
if [[ "$(docker info --format '{{.MemoryLimit}}')" != true || "$(docker info --format '{{.PidsLimit}}')" != true ]]; then
  echo 'WARNING: Docker cannot enforce memory/process limits on this host. Trusted private tests only.' >&2
fi
lock_dir="${XDG_RUNTIME_DIR:-/tmp}/defaultstack-deploy-${UID}"
(umask 077; mkdir -p "$lock_dir")
exec 9>"$lock_dir/deploy.lock"
flock -n 9 || { echo 'Another deployment is running.' >&2; exit 1; }
container="defaultstack-app-$name"
previous="$container-previous"
candidate="$container-check-$$"
image="defaultstack/$name:$(date -u +%Y%m%d%H%M%S)-$$"
options=(--memory=256m --memory-swap=256m --cpus=0.5 --pids-limit=128 --read-only --tmpfs /tmp:rw,noexec,nosuid,size=32m --cap-drop=ALL --security-opt=no-new-privileges --user=1000:1000 --log-opt max-size=10m --log-opt max-file=3)
cleanup() { docker rm -f "$candidate" >/dev/null 2>&1 || true; }
trap cleanup EXIT
health() {
  local address="$1"
  for attempt in {1..30}; do
    if curl --fail --silent --max-time 2 "$address/healthz" >/dev/null; then return 0; fi
    sleep 1
  done
  return 1
}
# Build context must exclude secrets using .dockerignore. No host folders or Docker socket are mounted.
docker build --tag "$image" "$source_dir"
docker run -d --name "$candidate" "${options[@]}" -p 127.0.0.1::8080 "$image" >/dev/null
candidate_port="$(docker inspect --format '{{(index (index .NetworkSettings.Ports "8080/tcp") 0).HostPort}}' "$candidate")"
health "http://127.0.0.1:$candidate_port" || { echo 'Candidate failed health check; current app unchanged.' >&2; exit 1; }
cleanup
had_previous=false
if docker container inspect "$container" >/dev/null 2>&1; then
  docker rm -f "$previous" >/dev/null 2>&1 || true
  docker stop --time 15 "$container" >/dev/null
  docker rename "$container" "$previous"
  had_previous=true
fi
if docker run -d --restart unless-stopped --name "$container" "${options[@]}" -p "127.0.0.1:$port:8080" "$image" >/dev/null && health "http://127.0.0.1:$port"; then
  printf 'Deployed %s at http://127.0.0.1:%s (image %s)\n' "$name" "$port" "$image"
  printf 'Logs: docker logs --tail 100 %s\n' "$container"
else
  docker rm -f "$container" >/dev/null 2>&1 || true
  if $had_previous; then
    docker rename "$previous" "$container"
    docker start "$container" >/dev/null
    health "http://127.0.0.1:$port" || { echo 'Rollback could not recover; inspect Docker logs.' >&2; exit 1; }
  fi
  echo 'Deployment failed; previous container restored when available.' >&2
  exit 1
fi
