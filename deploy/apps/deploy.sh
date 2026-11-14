#!/usr/bin/env bash
# Trusted local source only. Never expose Docker access through an unauthenticated API.
set -Eeuo pipefail
name="${1:-}"
source_dir="${2:-}"
port="${3:-3200}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ "$name" =~ ^[a-z][a-z0-9-]{0,39}$ ]] || { echo 'Usage: bash deploy/apps/deploy.sh <app-name> <source-dir> [port 3200-3299]' >&2; exit 1; }
[[ "$port" =~ ^[0-9]{4}$ ]] && (( port >= 3200 && port <= 3299 )) || { echo 'Use a port from 3200 to 3299.' >&2; exit 1; }
[[ "$name" != *-previous && "$name" != *-check-* ]] || { echo "Name suffix reserved for deployment recovery." >&2; exit 1; }
[[ -f "$source_dir/Dockerfile" ]] || { echo 'Source needs a Dockerfile and /healthz endpoint.' >&2; exit 1; }
for command in docker curl flock node; do command -v "$command" >/dev/null || { echo "Missing: $command" >&2; exit 1; }; done
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
build_id="$name-$(date -u +%Y%m%d%H%M%S)-$$"
state_dir="${DEFAULTSTACK_STATE_DIR:-$HOME/.local/state/defaultstack}"
(umask 077; mkdir -p "$state_dir/builds")
node "$script_dir/record-build.mjs" "$build_id" "$name" building "$image"
options=(--memory=256m --memory-swap=256m --cpus=0.5 --pids-limit=128 --read-only --tmpfs /tmp:rw,noexec,nosuid,size=32m --cap-drop=ALL --security-opt=no-new-privileges --user=1000:1000 --log-opt max-size=10m --log-opt max-file=3)
cleanup() { docker rm -f "$candidate" >/dev/null 2>&1 || true; }
phase=build
success=false
promotion_started=false
had_previous=false
finish() {
  local result=$?
  local rollback_failed=false
  trap - EXIT INT TERM
  cleanup
  if ! $success && $promotion_started; then
    echo 'Deployment interrupted or failed. Recovering previous state…' >&2
    if $had_previous; then
      if docker container inspect "$previous" >/dev/null 2>&1; then
        docker rm -f "$container" >/dev/null 2>&1 || true
        docker rename "$previous" "$container" || rollback_failed=true
      fi
      if ! $rollback_failed; then docker start "$container" >/dev/null || rollback_failed=true; fi
      if ! $rollback_failed; then health "http://127.0.0.1:$port" || rollback_failed=true; fi
      if $rollback_failed; then
        echo 'Previous app needs attention. Inspect Docker logs.' >&2
        result=1
      else
        echo 'Previous app restored.' >&2
      fi
    else
      docker rm -f "$container" >/dev/null 2>&1 || true
    fi
  fi
  local build_status=failed
  if $success; then build_status=ready; elif $promotion_started && $had_previous && ! $rollback_failed; then build_status=rolled-back; fi
  printf '\n[DefaultStackr] Outcome: %s; last stage: %s\n' "$build_status" "$phase" >>"$state_dir/builds/$build_id.log"
  node "$script_dir/record-build.mjs" "$build_id" "$name" "$build_status" "$image" || echo 'Could not save build result.' >&2
  return "$result"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
health() {
  local address="$1"
  for attempt in {1..30}; do
    if curl --fail --silent --max-time 2 "$address/healthz" >/dev/null; then return 0; fi
    sleep 1
  done
  return 1
}
# Build context must exclude secrets using .dockerignore. No host folders or Docker socket are mounted.
docker build --progress=plain --tag "$image" "$source_dir" 2>&1 | node "$script_dir/capture-build.mjs" "$state_dir/builds/$build_id.log"
phase=candidate-start
docker run -d --init --label io.defaultstack.managed=true --name "$candidate" "${options[@]}" -p 127.0.0.1::8080 "$image" >/dev/null
candidate_port="$(docker inspect --format '{{(index (index .NetworkSettings.Ports "8080/tcp") 0).HostPort}}' "$candidate")"
phase=candidate-health
health "http://127.0.0.1:$candidate_port" || { echo 'Candidate failed health check; current app unchanged.' >&2; exit 1; }
cleanup
phase=promotion
if docker container inspect "$container" >/dev/null 2>&1; then
  old_image="$(docker inspect --format '{{.Config.Image}}' "$container")"
  [[ "$old_image" == "defaultstack/$name:"* ]] || { echo 'Existing container is not owned by this app; refusing replacement.' >&2; exit 1; }
  old_port="$(docker inspect --format '{{(index (index .HostConfig.PortBindings "8080/tcp") 0).HostPort}}' "$container")"
  [[ "$old_port" == "$port" ]] || { echo "Existing app uses port $old_port. Keep that port for safe recovery." >&2; exit 1; }
  if docker container inspect "$previous" >/dev/null 2>&1; then
    previous_image="$(docker inspect --format '{{.Config.Image}}' "$previous")"
    [[ "$previous_image" == "defaultstack/$name:"* ]] || { echo 'Previous container name belongs to another app.' >&2; exit 1; }
    docker rm -f "$previous" >/dev/null
  fi
  had_previous=true
  promotion_started=true
  docker stop --time 15 "$container" >/dev/null
  docker rename "$container" "$previous"
else
  promotion_started=true
fi
if docker run -d --init --label io.defaultstack.managed=true --restart unless-stopped --name "$container" "${options[@]}" -p "127.0.0.1:$port:8080" "$image" >/dev/null && health "http://127.0.0.1:$port"; then
  success=true
  printf 'Deployed %s at http://127.0.0.1:%s (image %s)\n' "$name" "$port" "$image"
  printf 'Logs: docker logs --tail 100 %s\n' "$container"
  if command -v node >/dev/null; then
    node "$script_dir/export-status.mjs" || echo 'App is running, but status export failed. Run export-status.mjs again.' >&2
  fi
else
  echo 'Deployment failed. Restoring previous state…' >&2
  exit 1
fi
