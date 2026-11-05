#!/usr/bin/env bash
set -u

# Uso:
# SUPABASE_URL=https://SEU-PROJECTO.supabase.co \
# SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA \
# ./supabase/scripts/test_waitlist_anon_api.sh

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_ANON_KEY:-}" ]]; then
  echo "Defina SUPABASE_URL e SUPABASE_ANON_KEY antes de executar." >&2
  exit 2
fi

tables=(
  waitlist_subscribers
  waitlist_campaigns
  waitlist_rate_limits
  waitlist_admin_attempts
  waitlist_templates
  waitlist_sends
  waitlist_admin_events
)

base_url="${SUPABASE_URL%/}/rest/v1"
headers=(-H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY" -H "Accept: application/json")
failed=0

for table in "${tables[@]}"; do
  echo "== $table =="

  get_response=$(curl -sS -w '\n%{http_code}' "${headers[@]}" "$base_url/$table?select=*")
  get_body=${get_response%$'\n'*}
  get_status=${get_response##*$'\n'}
  echo "GET $get_status $get_body"
  get_body_trimmed=$(echo "$get_body" | xargs)
  if [[ "$get_status" =~ ^2 && "$get_body_trimmed" != "[]" ]]; then
    echo "FALHA: leitura retornou dados." >&2
    failed=1
  elif [[ "$get_status" =~ ^2 && "$get_body_trimmed" == "[]" ]]; then
    :
  elif [[ ! "$get_status" =~ ^[45] ]]; then
    echo "FALHA: GET inesperado." >&2
    failed=1
  fi

  for method in POST PATCH DELETE; do
    filter=''
    [[ "$method" == "PATCH" || "$method" == "DELETE" ]] && filter='?id=eq.00000000-0000-0000-0000-000000000000'

    if [[ "$method" == "POST" ]]; then
      response=$(curl -sS -w '\n%{http_code}' "${headers[@]}" -H "Content-Type: application/json" -d '{}' -X POST "$base_url/$table")
    elif [[ "$method" == "PATCH" ]]; then
      response=$(curl -sS -w '\n%{http_code}' "${headers[@]}" -H "Content-Type: application/json" -d '{}' -X PATCH "$base_url/$table$filter")
    else
      response=$(curl -sS -w '\n%{http_code}' "${headers[@]}" -X DELETE "$base_url/$table$filter")
    fi

    body=${response%$'\n'*}
    status=${response##*$'\n'}
    echo "$method $status $body"
    if [[ "$status" =~ ^2 && "$body" != "[]" && "$body" != "" ]]; then
      echo "FALHA: $method modificou ou recebeu resposta 2xx." >&2
      failed=1
    fi
  done
done

exit "$failed"
