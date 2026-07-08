#!/usr/bin/env bash
set -euo pipefail

env_file="/var/opt/jakawi.com/.env.stack"

usage() {
  cat <<'USAGE'
Usage: scripts/deploy-preflight.sh [--env-file PATH]

Validates required JAKAWI deploy variables without printing values.
Defaults to /var/opt/jakawi.com/.env.stack.
Does not execute docker deploy.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      if [[ $# -lt 2 ]]; then
        echo "FAIL deploy preflight"
        echo "--env-file requires a path" >&2
        exit 2
      fi
      env_file="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "FAIL deploy preflight"
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

required_vars=(
  DATABASE_URL
  SESSION_SECRET
  APP_ENCRYPTION_KEY
  CRM_WEBHOOK_ENABLED
  CUSTOM_DOMAINS_ENABLED
  CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED
  META_CAPI_ENABLED
  EMAIL_DELIVERY_MODE
)

if [[ ! -f "$env_file" ]]; then
  echo "ENV_FILE=missing"
  echo "FAIL deploy preflight"
  exit 1
fi

if [[ ! -r "$env_file" ]]; then
  echo "ENV_FILE=unreadable"
  echo "FAIL deploy preflight"
  exit 1
fi

declare -A present=()

while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"

  [[ -z "$line" || "${line:0:1}" == "#" ]] && continue

  if [[ "$line" == export[[:space:]]* ]]; then
    line="${line#export}"
    line="${line#"${line%%[![:space:]]*}"}"
  fi

  [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*= ]] || continue

  key="${BASH_REMATCH[1]}"
  value="${line#*=}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"

  if [[ -n "$value" && "$value" != '""' && "$value" != "''" ]]; then
    present["$key"]=1
  fi
done < "$env_file"

failed=0

for key in "${required_vars[@]}"; do
  if [[ -n "${present[$key]:-}" ]]; then
    echo "$key=present"
  else
    echo "$key=missing"
    failed=1
  fi
done

if [[ "$failed" -eq 0 ]]; then
  echo "PASS deploy preflight"
else
  echo "FAIL deploy preflight"
fi

exit "$failed"
