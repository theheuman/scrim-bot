#!/bin/bash
config_file_location=config.json
service_key_file_location=service-account-key.json

warn_if_missing() {
  local var_name="$1"
  local default_value="$2"
  if [ -z "${!var_name}" ]; then
    echo "Warning: $var_name is missing, using default: $default_value"
    eval "$var_name='$default_value'"
  fi
}

warn_if_missing "LOBBY_SIZE" "20"
warn_if_missing "DISCORD_BOT_TOKEN" "default_bot_token"
warn_if_missing "DISCORD_CLIENT_ID" "default_client_id"
warn_if_missing "DISCORD_GUILD_ID" "default_guild_id"
warn_if_missing "DISCORD_GUILD_ID_LEAGUE" "default_guild_id_league"
warn_if_missing "NHOST_SECRET" "default_admin_secret"
warn_if_missing "NHOST_SUBDOMAIN" "default_subdomain"
warn_if_missing "NHOST_REGION" "default_region"
warn_if_missing "GOOGLE_KEY_ID" "default_key_id"
warn_if_missing "GOOGLE_KEY_FILE" "default_key_file"
warn_if_missing "GOOGLE_KEY_EMAIL" "default_key_email"
warn_if_missing "GOOGLE_CLIENT_ID" "default_client_id"
warn_if_missing "GOOGLE_KEY_CERT_URL" "default_key_cert_url"

cat > $config_file_location <<EOF
{
  "dev": {
    "lobbySize": 3,
    "discord": {
      "token": "DEV_DISCORD_BOT_TOKEN",
      "clientId": "DEV_DISCORD_CLIENT_ID",
      "guildId": {
        "scrim": "DEV_DISCORD_GUILD_ID_SCRIMS",
        "league": "DEV_DISCORD_GUILD_ID_LEAGUE"
      }
    },
    "nhost": {
      "adminSecret": "nhost-admin-secret",
      "subdomain": "local",
      "region": "local"
    }
  },
  "prod": {
    "lobbySize": ${LOBBY_SIZE},
    "discord": {
      "token": "${DISCORD_BOT_TOKEN}",
      "clientId": "${DISCORD_CLIENT_ID}",
      "guildId": {
        "scrim": "${DISCORD_GUILD_ID}",
        "league": "${DISCORD_GUILD_ID_LEAGUE}"
      }
    },
    "nhost": {
      "adminSecret": "${NHOST_SECRET}",
      "subdomain": "${NHOST_SUBDOMAIN}",
      "region": "${NHOST_REGION}"
    }
  }
}
EOF

jq -n \
  --arg pk "$GOOGLE_KEY_FILE" \
  --arg pkid "$GOOGLE_KEY_ID" \
  --arg email "$GOOGLE_KEY_EMAIL" \
  --arg cid "$GOOGLE_CLIENT_ID" \
  --arg cert "$GOOGLE_KEY_CERT_URL" \
  '{
    type: "service_account",
    project_id: "vesa-apex",
    private_key_id: $pkid,
    private_key: $pk,
    client_email: $email,
    client_id: $cid,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: $cert,
    universe_domain: "googleapis.com"
  }' > "$service_key_file_location"
