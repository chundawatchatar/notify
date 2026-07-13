#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
OPENAPI_FILE="$ROOT_DIR/packages/openapi/openapi.json"
TYPES_FILE="$ROOT_DIR/packages/api-client/src/generated/schema.ts"

cd "$ROOT_DIR"

before=$(git hash-object "$OPENAPI_FILE" "$TYPES_FILE")
pnpm api-client:generate
after=$(git hash-object "$OPENAPI_FILE" "$TYPES_FILE")

if [ "$before" != "$after" ]; then
  echo "Generated API contracts were stale. Commit the regenerated files." >&2
  exit 1
fi
