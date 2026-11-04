#!/usr/bin/env sh
set -eu
export MSYS_NO_PATHCONV=1

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP="${KEEP:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SNAPSHOT="/app/data/snapshot-$STAMP.db"
TARGET="$BACKUP_DIR/orion-$STAMP.db"

cleanup() {
  docker compose exec -T server rm -f "$SNAPSHOT" || true
}
trap cleanup EXIT

mkdir -p "$BACKUP_DIR"

docker compose exec -T server node -e '
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
prisma.$executeRawUnsafe("VACUUM INTO ?", process.argv[1]).then(
  () => prisma.$disconnect(),
  (error) => { console.error(error.message); process.exit(1); },
);
' "$SNAPSHOT"

docker compose exec -T server cat "$SNAPSHOT" > "$TARGET"

if [ "$(head -c 15 "$TARGET")" != "SQLite format 3" ]; then
  echo "ECHEC sauvegarde invalide : $TARGET"
  rm -f "$TARGET"
  exit 1
fi

ls -1t "$BACKUP_DIR"/orion-*.db | tail -n +"$((KEEP + 1))" | while read -r old; do
  rm -f "$old"
done

echo "Sauvegarde créée : $TARGET"
