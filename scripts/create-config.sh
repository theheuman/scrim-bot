#!/bin/bash
file_location=config.json

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
warn_if_missing "NHOST_SECRET" "default_admin_secret"
warn_if_missing "NHOST_SUBDOMAIN" "default_subdomain"
warn_if_missing "NHOST_REGION" "default_region"

cat > $file_location <<EOF
{
  "dev": {
    "lobbySize": 3,
    "discord": {
      "token": "DEV_DISCORD_BOT_TOKEN",
      "clientId": "DEV_DISCORD_CLIENT_ID",
      "guildId": "DEV_DISCORD_GUILD_ID"
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
      "guildId": "${DISCORD_GUILD_ID}"
    },
    "nhost": {
      "adminSecret": "${NHOST_SECRET}",
      "subdomain": "${NHOST_SUBDOMAIN}",
      "region": "${NHOST_REGION}"
    }
  }
}
EOF
