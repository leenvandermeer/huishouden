#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${REPO_DIR}/infra/.env.deploy"

shell_quote() {
  printf "'%s'" "${1//\'/\'\\\'\'}"
}

if [[ "${1:-}" != "--confirm-production" && "${CONFIRM_PRODUCTION_DEPLOY:-}" != "ja" ]]; then
  echo "❌  Productie-deploy niet gestart."
  echo "   Werk eerst lokaal in development en deploy gebundeld met:"
  echo "   bash scripts/deploy-remote.sh --confirm-production"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "❌  ${ENV_FILE} niet gevonden."
  echo "   Kopieer infra/.env.deploy.example naar infra/.env.deploy en vul DEPLOY_HOST en DEPLOY_DIR in."
  exit 1
fi

# shellcheck disable=SC1090
source "${ENV_FILE}"

: "${DEPLOY_HOST:?Zet DEPLOY_HOST in infra/.env.deploy}"
: "${DEPLOY_DIR:?Zet DEPLOY_DIR in infra/.env.deploy}"

if [[ "${DEPLOY_HOST}" == *"<"* || "${DEPLOY_DIR}" == *"<"* ]]; then
  echo "❌  infra/.env.deploy bevat nog voorbeeldwaarden."
  echo "   Vul DEPLOY_HOST en DEPLOY_DIR in, bijvoorbeeld DEPLOY_HOST=latero-prod."
  exit 1
fi

cd "${REPO_DIR}"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "❌ Commit eerst alle wijzigingen voordat je deployt." >&2
  exit 1
fi
DEPLOY_COMMIT="$(git rev-parse HEAD)"
DEPLOY_REPOSITORY="https://github.com/leenvandermeer/huishouden.git"
REMOTE_COMMIT="$(git ls-remote "${DEPLOY_REPOSITORY}" refs/heads/main | cut -f1)"
if [[ "${DEPLOY_COMMIT}" != "${REMOTE_COMMIT}" ]]; then
  echo "❌ Push de huidige commit eerst naar origin/main voordat je deployt." >&2
  exit 1
fi
REMOTE_DIR="$(shell_quote "${DEPLOY_DIR}")"
RELEASE_ID="$(date -u '+%Y%m%dT%H%M%SZ')"

echo "▶ Git-commit ${DEPLOY_COMMIT} deployen..."
ssh -o BatchMode=yes "${DEPLOY_HOST}" \
  "DEPLOY_DIR=${REMOTE_DIR} DEPLOY_COMMIT='${DEPLOY_COMMIT}' RELEASE_ID='${RELEASE_ID}' DEPLOY_REPOSITORY='${DEPLOY_REPOSITORY}' bash -s" <<'REMOTE'
set -euo pipefail
mkdir -p "${DEPLOY_DIR}/.releases"
cd "${DEPLOY_DIR}"
if [[ -f scripts/deploy.sh ]]; then
  tar --exclude='./.releases' --exclude='./.git' --exclude='./.next' --exclude='./node_modules' --exclude='./backups' --exclude='./infra/.env.prod' --exclude='./infra/.env.deploy' -czf ".releases/${RELEASE_ID}.tar.gz" .
  if [[ -d .git ]]; then
    if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
      echo "Productie bevat gewijzigde Git-bestanden; deploy gestopt." >&2
      exit 1
    fi
    git rev-parse HEAD > ".releases/${RELEASE_ID}.commit"
  fi
fi
if [[ ! -d .git ]]; then
  git init -b main
  git remote add origin "${DEPLOY_REPOSITORY}"
fi
if [[ "$(git remote get-url origin)" != "${DEPLOY_REPOSITORY}" ]]; then
  echo "Onverwachte Git-origin op productie; deploy gestopt." >&2
  exit 1
fi
git fetch origin main
if [[ "$(git rev-parse origin/main)" != "${DEPLOY_COMMIT}" ]]; then
  echo "origin/main is gewijzigd tijdens de deploy; probeer opnieuw." >&2
  exit 1
fi
# The source snapshot above preserves the pre-Git installation on first deploy.
git checkout --force -B main "${DEPLOY_COMMIT}"
git branch --set-upstream-to=origin/main main
CONFIRM_PRODUCTION_DEPLOY=ja bash scripts/deploy.sh
REMOTE

echo "✅ Commit: ${DEPLOY_COMMIT}; rollbackpunt: ${RELEASE_ID}"
