#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-3001}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "▶ Stop bestaande processen op poort ${PORT}..."
lsof -ti ":${PORT}" | xargs kill -9 2>/dev/null || true

echo "▶ Stop Docker app-container (indien actief)..."
docker stop huishouden-app 2>/dev/null || true

echo "▶ Start Docker postgres (indien nodig)..."
docker compose -f "${REPO_DIR}/docker-compose.yml" up -d postgres 2>/dev/null || true

echo "▶ Wacht op postgres..."
sleep 3

echo "▶ Start dev server op poort ${PORT}..."
cd "${REPO_DIR}"
exec npx next dev --port "${PORT}"
