#!/usr/bin/env bash

set -Eeuo pipefail

action="${1:-deploy}"
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
public_health_url="${PUBLIC_HEALTH_URL:-https://specod.aiautomatizaciy.ru/api/health}"
lock_file="/run/lock/workwear-production-deploy.lock"
state_dir="/var/lib/deployments/workwear"

if [[ "$action" != deploy && "$action" != verify ]]; then
  echo "Usage: $0 [deploy|verify]" >&2
  exit 2
fi

cd "$repo_dir"
[[ -f .env ]] || { echo "Production .env is missing." >&2; exit 1; }
env_mode="$(stat -c '%a' .env)"
(( (8#$env_mode & 077) == 0 )) || { echo "Production .env must not be accessible to group or other users." >&2; exit 1; }

compose=(docker compose)
"${compose[@]}" config --quiet

container_status() {
  local service="$1" container_id
  container_id="$("${compose[@]}" ps -q "$service")"
  [[ -n "$container_id" ]] || return 1
  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id"
}

wait_for_health() {
  local service="$1" status
  for _ in {1..36}; do
    status="$(container_status "$service" 2>/dev/null || true)"
    [[ "$status" == healthy ]] && return 0
    [[ "$status" == unhealthy || "$status" == exited || "$status" == dead ]] && break
    sleep 5
  done
  echo "$service did not become healthy." >&2
  "${compose[@]}" logs --tail=100 "$service" >&2
  return 1
}

verify() {
  [[ "$(container_status postgres)" == healthy ]]
  [[ "$(container_status app)" == healthy ]]
  curl --fail --silent --show-error --max-time 10 http://127.0.0.1:3000/api/health >/dev/null
  curl --fail --silent --show-error --max-time 15 "$public_health_url" >/dev/null
  "${compose[@]}" exec -T app node -e 'const { PrismaClient } = require("@prisma/client"); const p = new PrismaClient(); p.user.count().then(() => p.$disconnect()).catch(async (e) => { console.error(e.message); await p.$disconnect(); process.exit(1); });'
  printf 'verification=ok\napp_image=%s\n' "$(docker inspect --format '{{.Config.Image}}' "$("${compose[@]}" ps -q app)")"
}

if [[ "$action" == verify ]]; then
  verify
  exit 0
fi

exec 9>"$lock_file"
flock -n 9 || { echo "Another Workwear deployment is already running." >&2; exit 1; }

[[ "$(container_status postgres)" == healthy ]] || { echo "PostgreSQL is not healthy; deployment stopped." >&2; exit 1; }
"$repo_dir/deploy/backup-production-data.sh"

app_id="$("${compose[@]}" ps -q app)"
old_image_id="$(docker inspect --format '{{.Image}}' "$app_id")"
image_ref="$(docker inspect --format '{{.Config.Image}}' "$app_id")"
completed=0

rollback() {
  [[ "$completed" -eq 1 ]] && return
  echo "Deployment failed; restoring previous Workwear image." >&2
  docker image tag "$old_image_id" "$image_ref" >/dev/null 2>&1 || true
  "${compose[@]}" up -d --no-build --no-deps app >/dev/null 2>&1 || true
}
trap rollback EXIT

docker image tag "$old_image_id" workwear-app-app:rollback
"${compose[@]}" build app
"${compose[@]}" run --rm --no-deps app npx prisma migrate deploy
"${compose[@]}" up -d --no-deps app
wait_for_health app
verify

install -d -m 0750 "$state_dir"
printf 'revision=%s\ndeployed_at=%s\nbackup=created\n' "$(git rev-parse HEAD 2>/dev/null || echo unknown)" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$state_dir/last-successful"
completed=1
trap - EXIT
echo "Workwear production deployment completed successfully."
