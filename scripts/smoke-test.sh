#!/usr/bin/env sh
set -eu

BASE_URL="${1:-http://localhost:4200}"

check() {
  if curl -fsS -o /dev/null "$BASE_URL$1"; then
    echo "OK   $1"
  else
    echo "ECHEC $1"
    exit 1
  fi
}

check /api/health
check /api/contacts
check /api/organizations
check /
check /contacts

echo "Smoke test réussi sur $BASE_URL"
