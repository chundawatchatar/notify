#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

need_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

run_pnpm() {
  mise exec -- pnpm "$@"
}

need_command mise
need_command docker

echo "Installing pinned runtimes with mise..."
mise install

if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
else
  echo ".env already exists; leaving it unchanged."
fi

echo "Installing JavaScript dependencies..."
run_pnpm install

echo "Starting local Docker services..."
docker compose up -d --wait

echo "Setting up the Phoenix API database..."
run_pnpm api:setup

echo "Development environment is ready."
