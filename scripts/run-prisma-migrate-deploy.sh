#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"
app_dir="$repo_root/app"

if [[ ! -d "$app_dir" ]]; then
  echo "FAIL prisma migrate deploy"
  echo "app directory not found" >&2
  exit 2
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "FAIL prisma migrate deploy"
  echo "DATABASE_URL=missing"
  exit 1
fi

run_step() {
  local name="$1"
  shift

  if [[ -n "${QA_DIR:-}" ]]; then
    mkdir -p "$QA_DIR/evidence"
    "$@" > "$QA_DIR/evidence/$name.txt" 2>&1
  else
    "$@"
  fi
}

cd "$app_dir"

echo "prisma_migrate_status_before=running"
run_step "prisma-migrate-status-before" npx prisma migrate status

echo "prisma_migrate_deploy=running"
run_step "prisma-migrate-deploy" npx prisma migrate deploy

echo "prisma_migrate_status_after=running"
run_step "prisma-migrate-status-after" npx prisma migrate status

echo "PASS prisma migrate deploy"
