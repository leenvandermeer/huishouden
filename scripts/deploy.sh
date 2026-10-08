#!/usr/bin/env bash

set -euo pipefail

log() {
  echo "$*"
}

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${REPO_DIR}/infra/.env.prod"
COMPOSE_FILE="${REPO_DIR}/docker-compose.yml"

if [[ "${CONFIRM_PRODUCTION_DEPLOY:-}" != "ja" ]]; then
  echo "❌  Productie-deploy niet gestart."
  echo "   Draai productie alleen bewust, bijvoorbeeld via:"
  echo "   bash scripts/deploy-remote.sh --confirm-production"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "❌  ${ENV_FILE} niet gevonden."
  echo "   Kopieer infra/.env.prod.example naar infra/.env.prod en vul de productiegegevens in."
  exit 1
fi

# shellcheck disable=SC1090
source "${ENV_FILE}"

APP_HOST_PORT="${APP_HOST_PORT:-3000}"
PUBLIC_URL="${APP_URL:-http://localhost:${APP_HOST_PORT}}"
PUBLIC_HOST=""
if [[ "${PUBLIC_URL}" =~ ^https?://([^/:]+) ]]; then
  PUBLIC_HOST="${BASH_REMATCH[1]}"
fi

echo ""
echo "══════════════════════════════════════════════════"
echo "  Huishouden — Deploy"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "══════════════════════════════════════════════════"
echo ""

cd "${REPO_DIR}"

log "▶  1/5  Git-versie controleren..."
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Git checkout ontbreekt; gebruik scripts/deploy-remote.sh." >&2
  exit 1
fi
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Commit eerst de gewijzigde broncode." >&2
  exit 1
fi
COMMIT="$(git rev-parse --short HEAD)"
log "   Commit: ${COMMIT}"
echo ""

log "▶  2/5  Database starten..."
docker compose \
  --env-file "${ENV_FILE}" \
  -f "${COMPOSE_FILE}" \
  up -d postgres
echo ""

log "▶  3/5  Database migraties uitvoeren..."
docker compose \
  --env-file "${ENV_FILE}" \
  -f "${COMPOSE_FILE}" \
  --profile operations \
  build operations

docker compose \
  --env-file "${ENV_FILE}" \
  -f "${COMPOSE_FILE}" \
  --profile operations \
  run --rm operations npm run db:migrate

if [[ -n "${SEED_ADMIN_EMAIL:-}" && -n "${SEED_ADMIN_PASSWORD:-}" ]]; then
  docker compose \
    --env-file "${ENV_FILE}" \
    -f "${COMPOSE_FILE}" \
    --profile operations \
    run --rm operations npm run db:seed
fi
echo ""

log "▶  4/5  Applicatie bouwen en herstarten..."
docker compose \
  --env-file "${ENV_FILE}" \
  -f "${COMPOSE_FILE}" \
  --profile app \
  up -d --build app
echo ""

log "▶  5/5  Health checks..."
sleep 5

LOCAL_STATUS="$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://localhost:${APP_HOST_PORT}/api/health" 2>/dev/null || echo "000")"
if [[ "${LOCAL_STATUS}" == "200" ]]; then
  log "   ✅  Lokale healthcheck ok (HTTP ${LOCAL_STATUS})"
else
  log "   ⚠️   Lokale healthcheck gaf HTTP ${LOCAL_STATUS}"
fi

PUBLIC_STATUS="$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${PUBLIC_URL}/api/health" 2>/dev/null || echo "000")"
if [[ "${PUBLIC_STATUS}" == "200" ]]; then
  log "   ✅  Publieke healthcheck ok op ${PUBLIC_URL} (HTTP ${PUBLIC_STATUS})"
else
  log "   ⚠️   Publieke healthcheck gaf HTTP ${PUBLIC_STATUS} op ${PUBLIC_URL}"
  if [[ -n "${PUBLIC_HOST}" ]] && ! getent hosts "${PUBLIC_HOST}" >/dev/null 2>&1; then
    log "      DNS mist nog voor ${PUBLIC_HOST}."
    log "      Zet een A-record naar het server-IP, en optioneel een AAAA-record als IPv6 gebruikt wordt."
  fi
fi

echo ""
echo "══════════════════════════════════════════════════"
echo "  Deploy klaar — commit ${COMMIT}"
echo "══════════════════════════════════════════════════"
echo ""
