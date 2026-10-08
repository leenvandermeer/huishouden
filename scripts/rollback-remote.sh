#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${REPO_DIR}/infra/.env.deploy"

if [[ "${1:-}" == "--list" ]]; then
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  ssh -o BatchMode=yes "${DEPLOY_HOST}" "find '${DEPLOY_DIR}/.releases' -maxdepth 1 -name '*.tar.gz' -printf '%f\n' | sort -r"
  exit 0
fi

if [[ "${1:-}" != "--confirm-production" || -z "${2:-}" ]]; then
  echo "❌ Productie-rollback niet gestart."
  echo "   Bekijk snapshots: bash scripts/rollback-remote.sh --list"
  echo "   Herstel bewust: bash scripts/rollback-remote.sh --confirm-production <release-id>"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "❌ ${ENV_FILE} niet gevonden."
  exit 1
fi

# shellcheck disable=SC1090
source "${ENV_FILE}"
: "${DEPLOY_HOST:?DEPLOY_HOST ontbreekt}"
: "${DEPLOY_DIR:?DEPLOY_DIR ontbreekt}"

RELEASE_ID="$2"
if [[ ! "${RELEASE_ID}" =~ ^[0-9]{8}T[0-9]{6}Z$ ]]; then
  echo "❌ Ongeldige release-id: ${RELEASE_ID}"
  exit 1
fi

echo "▶ Productie herstellen naar snapshot ${RELEASE_ID}..."
ssh -o BatchMode=yes "${DEPLOY_HOST}" "DEPLOY_DIR='${DEPLOY_DIR}' RELEASE_ID='${RELEASE_ID}' bash -s" <<'REMOTE'
set -euo pipefail
archive="${DEPLOY_DIR}/.releases/${RELEASE_ID}.tar.gz"
if [[ ! -f "${archive}" ]]; then
  echo "Snapshot ontbreekt: ${archive}" >&2
  exit 1
fi
if [[ -f "${DEPLOY_DIR}/.releases/${RELEASE_ID}.commit" ]]; then
  cd "${DEPLOY_DIR}"
  if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
    echo "Productie bevat gewijzigde Git-bestanden; rollback gestopt." >&2
    exit 1
  fi
  git checkout --detach "$(cat ".releases/${RELEASE_ID}.commit")"
else
  echo "Deze snapshot dateert van vóór Git. Gebruik een snapshot met .commit voor Git-rollback." >&2
  exit 1
fi
cd "${DEPLOY_DIR}"
CONFIRM_PRODUCTION_DEPLOY=ja bash scripts/deploy.sh
REMOTE

echo "✅ Productiecode hersteld naar ${RELEASE_ID}. Voer nu npm run prod:validate uit."
