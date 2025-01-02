#  Void scrim bot
A multipurpose bot to track scrim signups, low prio and player performance among other things

## Contributing
### Setup
This bot makes use of the npm package discord.js.

make sure to run
```sh
npm install
```

To run the bot, you'll need to add a config.json file to the root directory.

The file should contain:
```json
{
  "dev": {
    "discord": {
      "token": "BOT_TOKEN",
      "clientId": "DEV_DISCORD_CLIENT_ID",
      "guildId": "DEV_DISCORD_GUILD_ID"  
    },
    "nhost": {
      "adminSecret": "LOCAL_ADMIN_SECRET",
      "subdomain": "local_subdomain",
      "region": "local_region"
    }
  },
  "prod": {
    "discord": {
      "token": "BOT_TOKEN",
      "clientId": "DISCORD_CLIENT_ID",
      "guildId": "DISCORD_GUILD_ID"
    },
    "nhost": {
      "adminSecret": "ADMIN_SECRET",
      "subdomain": "subdomain",
      "region": "region"
    }
  }
}
```
Where BOT_TOKEN is the bot token taken from the discord application portal bot page
DISCORD_CLIENT_ID is the application ID from the discord application portal general information page
DISCORD_GUILD_ID is the server ID of the server the bot is running in

You can create a template config file by running 
`
npm run create-config
`

### Commands
All commands are in the commands directory and further information can be found in the README in that directory

## Deploying
In order to deploy any new commands you have added please utilize:
```sh
npm run deploy-commands
```

Then you can run the production script with 
```sh
npm run start:prod
```

