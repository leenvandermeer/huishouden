#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/infra/.env.prod"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Productieconfig ontbreekt: ${ENV_FILE}"
  exit 1
fi

# shellcheck disable=SC1090
source "${ENV_FILE}"

: "${APP_URL:?APP_URL ontbreekt in infra/.env.prod}"
: "${SEED_ADMIN_EMAIL:?SEED_ADMIN_EMAIL ontbreekt in infra/.env.prod}"
: "${SEED_ADMIN_PASSWORD:?SEED_ADMIN_PASSWORD ontbreekt in infra/.env.prod}"

LOGIN_EMAIL="${VALIDATION_EMAIL:-${SEED_ADMIN_EMAIL}}"
LOGIN_PASSWORD="${VALIDATION_PASSWORD:-${SEED_ADMIN_PASSWORD}}"
if [[ -n "${VALIDATION_CAN_EXPORT:-}" ]]; then
  CAN_EXPORT="${VALIDATION_CAN_EXPORT}"
elif [[ -n "${VALIDATION_EMAIL:-}" ]]; then
  CAN_EXPORT="false"
else
  CAN_EXPORT="true"
fi

COOKIE_JAR="$(mktemp)"
trap 'rm -f "${COOKIE_JAR}"' EXIT

check_status() {
  local label="$1"
  local expected="$2"
  local status="$3"

  if [[ "${status}" == "${expected}" ]]; then
    echo "ok  ${label}: HTTP ${status}"
  else
    echo "nok ${label}: HTTP ${status}, verwacht ${expected}"
    exit 1
  fi
}

health_status="$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${APP_URL}/api/health")"
check_status "health" "200" "${health_status}"

security_headers="$(curl -s -D - -o /dev/null --max-time 15 "${APP_URL}/inloggen")"
for header in \
  "content-security-policy:" \
  "strict-transport-security:" \
  "x-frame-options: DENY" \
  "x-content-type-options: nosniff" \
  "permissions-policy:" \
  "x-robots-tag: noindex"; do
  if ! grep -qi "${header}" <<<"${security_headers}"; then
    echo "nok security header mist: ${header}"
    exit 1
  fi
done
echo "ok  security headers"

login_page="$(curl -s --max-time 15 "${APP_URL}/inloggen")"
if grep -q "Voor productie: argon2" <<<"${login_page}"; then
  echo "nok loginpagina bevat oude productie-hint"
  exit 1
fi
if ! grep -q "autoCapitalize=\"none\"" <<<"${login_page}"; then
  echo "nok loginpagina mist autocapitalize bescherming"
  exit 1
fi
echo "ok  loginpagina"

reset_status="$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${APP_URL}/wachtwoord-resetten")"
check_status "resetpagina" "200" "${reset_status}"

LOGIN_HEADERS="$(mktemp)"
trap 'rm -f "${COOKIE_JAR}" "${LOGIN_HEADERS}"' EXIT

login_status="$(curl -s -c "${COOKIE_JAR}" -D "${LOGIN_HEADERS}" -o /dev/null -w "%{http_code}" --max-time 15 \
  -X POST "${APP_URL}/api/auth/login" \
  -F "email=${LOGIN_EMAIL}" \
  -F "password=${LOGIN_PASSWORD}")"
check_status "login" "303" "${login_status}"
login_location="$(awk 'BEGIN{IGNORECASE=1} /^location:/ {print $2}' "${LOGIN_HEADERS}" | tr -d '\r')"
if grep -q "error=" <<<"${login_location}"; then
  echo "nok login redirect naar foutstatus: ${login_location}"
  exit 1
fi
if ! grep -q "huishouden_session" "${COOKIE_JAR}"; then
  echo "nok login heeft geen sessie-cookie gezet"
  exit 1
fi

for route in /dashboard /planning /scenario /vermogen /dashboard/detail '/inzicht?rapport=overzicht' '/inzicht?rapport=trends' '/inzicht?rapport=jaar' '/inzicht?rapport=verwachting' /rapportages /rekeningen /budgetten /vaste-lasten /importeren /categoriseren /sparen /transacties /exporteren /beheer /beheer/productstatus /instellingen; do
  route_result="$(curl -s -L -b "${COOKIE_JAR}" -o /dev/null -w "%{http_code} %{url_effective}" --max-time 60 "${APP_URL}${route}")"
  route_status="${route_result%% *}"
  route_url="${route_result#* }"
  check_status "${route}" "200" "${route_status}"
  if [[ "${route_url}" == *"/inloggen"* ]]; then
    echo "nok ${route} eindigde op loginpagina: ${route_url}"
    exit 1
  fi
done

for redirect_check in "/analyse|/inzicht?rapport=trends" "/rapport|/rapportages" "/geldplanning|/planning" "/budget|/budgetten"; do
  source_path="${redirect_check%%|*}"
  destination="${redirect_check#*|}"
  redirect_headers="$(curl -s -D - -o /dev/null --max-time 15 "${APP_URL}${source_path}")"
  redirect_status="$(awk 'NR==1 {print $2}' <<<"${redirect_headers}")"
  redirect_location="$(awk 'BEGIN{IGNORECASE=1} /^location:/ {print $2}' <<<"${redirect_headers}" | tr -d '\r')"
  check_status "oude route ${source_path}" "307" "${redirect_status}"
  if [[ "${redirect_location}" != "${destination}" ]]; then
    echo "nok ${source_path} verwijst naar ${redirect_location}, verwacht ${destination}"
    exit 1
  fi
done

theme_script_status="$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${APP_URL}/theme-init.js")"
check_status "thema-initialisatie" "200" "${theme_script_status}"

REPORT_HEADERS="$(mktemp)"
REPORT_BODY="$(mktemp)"
CSV_BODY="$(mktemp)"
trap 'rm -f "${COOKIE_JAR}" "${LOGIN_HEADERS}" "${REPORT_HEADERS}" "${REPORT_BODY}" "${CSV_BODY}"' EXIT

if [[ "${CAN_EXPORT}" == "true" ]]; then
  report_export_status="$(curl -s -b "${COOKIE_JAR}" -D "${REPORT_HEADERS}" -o "${REPORT_BODY}" -w "%{http_code}" --max-time 60 "${APP_URL}/api/export/report?periodType=month")"
  check_status "maandrapport CSV" "200" "${report_export_status}"
  if ! grep -qi "content-type: text/csv" "${REPORT_HEADERS}"; then
    echo "nok maandrapport CSV heeft geen CSV content-type"
    exit 1
  fi
  if ! grep -qi "content-disposition: attachment; filename=\"huishouden-rapport-" "${REPORT_HEADERS}"; then
    echo "nok maandrapport CSV mist downloadbestandsnaam"
    exit 1
  fi
  if ! grep -q "sep=;" "${REPORT_BODY}" || ! grep -q '"Onderdeel";"Categorie";"Bedrag"' "${REPORT_BODY}"; then
    echo "nok maandrapport CSV mist de verwachte Excel-kolommen"
    exit 1
  fi
  echo "ok  maandrapport CSV: Excel-formaat"

  for export_path in \
    '/api/export/transactions?sortBy=amount&sortDirection=asc' \
    '/api/export/today' \
    '/api/export/forward' \
    '/api/export/scenario?type=one_off_expense&amount=250&date=2026-09-24&label=Controle' \
    '/api/export/wealth'; do
    csv_status="$(curl -s -b "${COOKIE_JAR}" -o "${CSV_BODY}" -w "%{http_code}" --max-time 60 "${APP_URL}${export_path}")"
    check_status "${export_path}" "200" "${csv_status}"
    if ! grep -q '"# csv_product_version";"1.0"' "${CSV_BODY}"; then
      echo "nok ${export_path} mist CSV-productcontract 1.0"
      exit 1
    fi
  done
  echo "ok  contextuele CSV-exports: productcontract 1.0"
else
  for export_path in \
    '/api/export/report?periodType=month' \
    '/api/export/transactions?sortBy=amount&sortDirection=asc' \
    '/api/export/today' \
    '/api/export/forward' \
    '/api/export/scenario?type=one_off_expense&amount=250&date=2026-09-24&label=Controle' \
    '/api/export/wealth'; do
    csv_status="$(curl -s -b "${COOKIE_JAR}" -o "${CSV_BODY}" -w "%{http_code}" --max-time 60 "${APP_URL}${export_path}")"
    check_status "${export_path} readonly-beveiliging" "403" "${csv_status}"
  done
  echo "ok  readonly-account kan geen CSV exporteren"
fi

echo "Productievalidatie klaar voor ${APP_URL}"
