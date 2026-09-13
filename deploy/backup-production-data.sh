#!/usr/bin/env bash

set -Eeuo pipefail

umask 077

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backup_root="${WORKWEAR_BACKUP_DIR:-/var/backups/workwear}"
retention_days="${WORKWEAR_BACKUP_RETENTION_DAYS:-14}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
partial_dir="$backup_root/.${timestamp}.partial"
final_dir="$backup_root/$timestamp"
lock_file="/run/lock/workwear-production-backup.lock"

if [[ ! "$retention_days" =~ ^[0-9]+$ ]] || (( retention_days < 1 )); then
  echo "WORKWEAR_BACKUP_RETENTION_DAYS must be a positive integer." >&2
  exit 1
fi

mkdir -p "$backup_root"
chmod 0700 "$backup_root"

exec 9>"$lock_file"
if ! flock -n 9; then
  echo "Another workwear backup is already running." >&2
  exit 1
fi

cleanup_partial() {
  if [[ -d "$partial_dir" ]]; then
    find "$partial_dir" -mindepth 1 -maxdepth 1 -type f -delete
    rmdir "$partial_dir"
  fi
}
trap cleanup_partial EXIT

mkdir "$partial_dir"
cd "$repo_dir"

postgres_id="$(docker compose ps -q postgres)"
if [[ -z "$postgres_id" ]] || [[ "$(docker inspect --format '{{.State.Running}}' "$postgres_id")" != "true" ]]; then
  echo "PostgreSQL container is not running." >&2
  exit 1
fi

docker exec "$postgres_id" sh -c \
  'exec pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --format=custom --compress=6 --no-owner --no-privileges' \
  > "$partial_dir/postgres.dump"

docker exec -i "$postgres_id" pg_restore --list < "$partial_dir/postgres.dump" > /dev/null

tar -C "$repo_dir" -czf "$partial_dir/storage.tar.gz" storage
tar -tzf "$partial_dir/storage.tar.gz" > /dev/null

(
  cd "$partial_dir"
  sha256sum postgres.dump storage.tar.gz > SHA256SUMS
  sha256sum --check SHA256SUMS > /dev/null
)

mv "$partial_dir" "$final_dir"
trap - EXIT

find "$backup_root" -mindepth 2 -maxdepth 2 -type f -mtime "+$retention_days" -delete
find "$backup_root" -mindepth 1 -maxdepth 1 -type d -empty -delete

echo "Workwear backup completed: $final_dir"
