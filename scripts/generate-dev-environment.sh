#!/bin/sh

ENV_FILE=.env

# remove existing environment files
rm -f "$ENV_FILE"
touch "$ENV_FILE"

read -r -d '' URL_TARGET_LOCAL << EOM
ADMINUSERS_URL=http://localhost:9700
CONNECTOR_URL=http://localhost:9300
DIRECT_DEBIT_CONNECTOR_URL=http://localhost:10100
PRODUCTS_URL=http://localhost:18000
LEDGER_URL=http://localhost:10700
PUBLIC_AUTH_BASE=http://localhost:9600
PUBLIC_AUTH_URL=http://localhost:9600/v1/frontend/auth
EOM

read -r -d '' URL_TARGET_TUNNEL << EOM
ADMINUSERS_URL=https://localhost:9001
CONNECTOR_URL=https://localhost:9003
DIRECT_DEBIT_CONNECTOR_URL=https://localhost:9004
PRODUCTS_URL=https://localhost:9005
LEDGER_URL=https://localhost:9007
PUBLIC_AUTH_BASE=http://localhost:9006
PUBLIC_AUTH_URL=http://localhost:9006/v1/frontend/auth
EOM

read -r -d '' URL_TARGET_DOCKER_TUNNEL << EOM
ADMINUSERS_URL=https://docker.for.mac.localhost:9001
CONNECTOR_URL=https://docker.for.mac.localhost:9003
DIRECT_DEBIT_CONNECTOR_URL=https://docker.for.mac.localhost:9004
PRODUCTS_URL=https://docker.for.mac.localhost:9005
LEDGER_URL=https://docker.for.mac.localhost:9007
PUBLIC_AUTH_BASE=https://docker.for.mac.localhost:9006
PUBLIC_AUTH_URL=https://docker.for.mac.localhost:9006/v1/frontend/auth
EOM

if [ "$1" = 'local' ] ; then
  URL_MAP="$URL_TARGET_LOCAL"
elif [ "$1" = 'docker' ] ; then
  URL_MAP="$URL_TARGET_DOCKER_TUNNEL"
else
  URL_MAP="$URL_TARGET_TUNNEL"
fi

cat > "$ENV_FILE" << EOM
NODE_ENV=development
PORT=3000
DISABLE_INTERNAL_HTTPS=true
NODE_TLS_REJECT_UNAUTHORIZED=0
DISABLE_APPMETRICS=true
COOKIE_MAX_AGE=10800000
COOKIE_MAX_AGE_GATEWAY_ACCOUNT=2592000000
SESSION_ENCRYPTION_KEY=naskjwefvwei72rjkwfmjwfi72rfkjwefmjwefiuwefjkbwfiu24fmjbwfk
SESSION_IN_MEMORY=true
LOGIN_ATTEMPT_CAP=2
DISABLE_REQUEST_LOGGING=true
NODE_TEST_MODE=true
GOCARDLESS_TEST_CLIENT_ID=some-test-client-id
GOCARDLESS_LIVE_CLIENT_ID=some-live-client-id
GOCARDLESS_TEST_OAUTH_BASE_URL=https://connect-sandbox.gocardless.com
GOCARDLESS_LIVE_OAUTH_BASE_URL=https://connect-sandbox.gocardless.com
SELFSERVICE_URL=https://selfservice.pymnt.localdomain
ZENDESK_URL=https://govuk.zendesk.com/api/v2
STRIPE_HOST=localhost
STRIPE_PORT=8000
ENABLE_MY_SERVICES_AS_DEFAULT_VIEW=true
$URL_MAP
EOM
