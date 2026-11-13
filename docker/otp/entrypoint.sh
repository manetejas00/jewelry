#!/bin/sh
set -eu

: "${OTP_NAMESPACE:?OTP_NAMESPACE is required}"
: "${OTP_SECRET:?OTP_SECRET is required}"

case "$OTP_NAMESPACE" in
  *[!A-Za-z0-9_-]*) echo "OTP_NAMESPACE must be alphanumeric" >&2; exit 1 ;;
esac
if [ "${#OTP_SECRET}" -lt 16 ]; then
  echo "OTP_SECRET must be at least 16 characters" >&2
  exit 1
fi

toml_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

NS=$(toml_escape "$OTP_NAMESPACE")
SECRET=$(toml_escape "$OTP_SECRET")
ROOT=$(toml_escape "${OTP_ROOT_URL:-http://127.0.0.1:9000}")
REDIS_HOST=$(toml_escape "${OTP_REDIS_HOST:-redis}")
REDIS_PASSWORD=$(toml_escape "${OTP_REDIS_PASSWORD:-}")

smtp_enabled=false
if [ "${OTP_EMAIL_ENABLED:-false}" = "true" ] && [ -n "${SMTP_HOST:-}" ] && [ -n "${SMTP_FROM:-}" ]; then
  smtp_enabled=true
fi
sms_kaleyra=false
sms_pinpoint=false
if [ "${OTP_SMS_ENABLED:-false}" = "true" ] && [ "${OTP_SMS_PROVIDER:-}" = "kaleyra_sms" ] && [ -n "${KALEYRA_API_KEY:-}" ] && [ -n "${KALEYRA_SID:-}" ] && [ -n "${KALEYRA_SMS_SENDER:-}" ]; then
  sms_kaleyra=true
fi
if [ "${OTP_SMS_ENABLED:-false}" = "true" ] && [ "${OTP_SMS_PROVIDER:-}" = "pinpoint_sms" ] && [ -n "${PINPOINT_APPLICATION_ID:-}" ] && [ -n "${PINPOINT_ACCESS_KEY:-}" ] && [ -n "${PINPOINT_SECRET_KEY:-}" ] && [ -n "${PINPOINT_REGION:-}" ]; then
  sms_pinpoint=true
fi
whatsapp_enabled=false
if [ "${OTP_WHATSAPP_ENABLED:-false}" = "true" ] && [ -n "${KALEYRA_WHATSAPP_API_KEY:-}" ] && [ -n "${KALEYRA_WHATSAPP_SID:-}" ] && [ -n "${KALEYRA_WHATSAPP_SENDER:-}" ] && [ -n "${KALEYRA_WHATSAPP_TEMPLATE:-}" ]; then
  whatsapp_enabled=true
fi

if [ "$smtp_enabled" = false ] && [ "$sms_kaleyra" = false ] && [ "$sms_pinpoint" = false ] && [ "$whatsapp_enabled" = false ]; then
  echo "Enable at least one configured OTP provider before starting the gateway" >&2
  exit 1
fi

SMTP_PORT_VALUE=${SMTP_PORT:-587}
if [ "$SMTP_PORT_VALUE" = "465" ]; then TLS_TYPE=TLS; else TLS_TYPE=STARTTLS; fi

cat > /app/config.toml <<EOF
[app]
address = "0.0.0.0:9000"
server_timeout = "10s"
enable_debug_logs = false
otp_ttl = 300
otp_max_attempts = 5
otp_max_generate = 8
root_url = "$ROOT"

[store.redis]
host = "$REDIS_HOST"
port = 6379
password = "$REDIS_PASSWORD"

[auth.veyora]
namespace = "$NS"
secret = "$SECRET"

[providers.smtp]
enabled = $smtp_enabled
subject = "{{ .Namespace }} verification code"
template = "/app/templates/email.tpl"
from_email = "$(toml_escape "${SMTP_FROM:-otp@localhost}")"
host = "$(toml_escape "${SMTP_HOST:-localhost}")"
port = $SMTP_PORT_VALUE
auth_protocol = "plain"
username = "$(toml_escape "${SMTP_USER:-}")"
password = "$(toml_escape "${SMTP_PASSWORD:-}")"
max_conns = 5
timeout = "10s"
tls_type = "$TLS_TYPE"
tls_skip_verify = false

[providers.kaleyra_sms]
enabled = $sms_kaleyra
subject = ""
template = "/app/templates/sms.txt"
sender = "$(toml_escape "${KALEYRA_SMS_SENDER:-}")"
sid = "$(toml_escape "${KALEYRA_SID:-}")"
api_key = "$(toml_escape "${KALEYRA_API_KEY:-}")"
sms_entity_id = "$(toml_escape "${KALEYRA_SMS_ENTITY_ID:-}")"
sms_template_id = "$(toml_escape "${KALEYRA_SMS_TEMPLATE_ID:-}")"
default_phone_code = "+91"
max_conns = 5
timeout = "10s"

[providers.kaleyra_whatsapp]
enabled = $whatsapp_enabled
subject = ""
template = "/app/templates/sms.txt"
sender = "$(toml_escape "${KALEYRA_WHATSAPP_SENDER:-}")"
sid = "$(toml_escape "${KALEYRA_WHATSAPP_SID:-}")"
api_key = "$(toml_escape "${KALEYRA_WHATSAPP_API_KEY:-}")"
default_phone_code = "+91"
template_name = "$(toml_escape "${KALEYRA_WHATSAPP_TEMPLATE:-otp}")"
max_conns = 5
timeout = "10s"

[providers.pinpoint_sms]
enabled = $sms_pinpoint
subject = "Verification"
template = "/app/templates/sms.txt"
application_id = "$(toml_escape "${PINPOINT_APPLICATION_ID:-}")"
access_key = "$(toml_escape "${PINPOINT_ACCESS_KEY:-}")"
secret_key = "$(toml_escape "${PINPOINT_SECRET_KEY:-}")"
region = "$(toml_escape "${PINPOINT_REGION:-}")"
sms_sender_id = "$(toml_escape "${PINPOINT_SENDER_ID:-}")"
sms_entity_id = "$(toml_escape "${PINPOINT_ENTITY_ID:-}")"
sms_template_id = "$(toml_escape "${PINPOINT_TEMPLATE_ID:-}")"
sms_message_type = "TRANSACTIONAL"
default_phone_code = "+91"
max_conns = 5
timeout = "10s"
EOF

exec /app/otpgateway --config /app/config.toml
