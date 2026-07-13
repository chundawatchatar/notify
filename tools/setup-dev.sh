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

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose is required. Install a Docker distribution with Compose support." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "The Docker daemon is unavailable. Start Docker and run setup again." >&2
  exit 1
fi

if [ ! -f .env.example ]; then
  echo "Missing required setup template: .env.example" >&2
  exit 1
fi

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
if ! docker compose up -d --wait; then
  echo "Local Docker services did not become healthy." >&2
  docker compose ps >&2 || true
  exit 1
fi

for service in postgres redis; do
  if ! docker compose ps --status running --services | grep -qx "$service"; then
    echo "Required Docker service is not running: $service" >&2
    docker compose ps >&2 || true
    exit 1
  fi
done

echo "Setting up the Phoenix API database..."
run_pnpm api:setup

echo "Development environment is ready."
