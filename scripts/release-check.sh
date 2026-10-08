#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Huishouden releasecheck =="
echo "1/6 lint"
npm run lint
echo "2/6 typecheck"
npm run typecheck
echo "3/6 tests"
npm test
echo "4/6 build"
npm run build
echo "5/6 database migrations"
npm run db:migrate
echo "6/6 productie-deploy- en rollbackguards"
if bash scripts/deploy-remote.sh >/tmp/huishouden-deploy-guard.log 2>&1; then
  echo "Deploy guard faalde: deploy zonder bevestiging mocht niet slagen." >&2
  exit 1
fi
if bash scripts/rollback-remote.sh >/tmp/huishouden-rollback-guard.log 2>&1; then
  echo "Rollback guard faalde: rollback zonder bevestiging mocht niet slagen." >&2
  exit 1
fi
if ! rg -q "Productie-rollback niet gestart" /tmp/huishouden-rollback-guard.log; then
  cat /tmp/huishouden-rollback-guard.log >&2
  echo "Rollback guard gaf niet de verwachte blokkademelding." >&2
  exit 1
fi
if ! rg -q "Productie-deploy niet gestart" /tmp/huishouden-deploy-guard.log; then
  cat /tmp/huishouden-deploy-guard.log >&2
  echo "Deploy guard gaf niet de verwachte blokkademelding." >&2
  exit 1
fi
echo "Releasecheck klaar. Productie is niet gedeployed."
