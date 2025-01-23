#!/bin/bash
file_location=config.json
cat > $file_location <<EOF
{
  "dev": {
    "lobbySize": 3,
    "discord": {
      "token": "BOT_TOKEN",
      "clientId": "DISCORD_CLIENT_ID",
      "guildId": "DISCORD_GUILD_ID"
    },
    "nhost": {
      "adminSecret": "nhost admin secret",
      "subdomain": "subdomain",
      "region": "region"
    }
  },
  "prod": {
    "lobbySize": 20,
    "discord": {
      "token": "BOT_TOKEN",
      "clientId": "DISCORD_CLIENT_ID",
      "guildId": "DISCORD_GUILD_ID"
    },
    "nhost": {
      "adminSecret": "nhost admin secret",
      "subdomain": "subdomain",
      "region": "region"
    }
  }
}
EOF
