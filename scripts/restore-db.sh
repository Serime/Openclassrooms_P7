#!/usr/bin/env sh
set -eu
export MSYS_NO_PATHCONV=1

BACKUP="${1:?usage : sh scripts/restore-db.sh backups/orion-AAAAMMJJTHHMMSSZ.db}"

if [ "$(head -c 15 "$BACKUP")" != "SQLite format 3" ]; then
  echo "ECHEC fichier de sauvegarde invalide : $BACKUP"
  exit 1
fi

docker compose stop client server

docker compose run --rm --no-deps -T --entrypoint sh server -c '
set -e
cat >/app/data/orion.db.restore
rm -f /app/data/orion.db-journal
mv /app/data/orion.db.restore /app/data/orion.db
' < "$BACKUP"

docker compose up -d --no-build --wait --wait-timeout 120

echo "Base restaurée depuis $BACKUP"
