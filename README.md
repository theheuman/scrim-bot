## Welcome to the Void scrim bot

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
  "token": "BOT_TOKEN",
  "clientId": "DISCORD_CLIENT_ID",
  "guildId": "DISCORD_GUILD_ID",
  "nhost": {
    "adminSecret": "ADMIN_SECRET",
    "subdomain": "subdomain",
    "region": "region"
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

The bot currently makes use of hot reloads for saving while running the application. Please run with
```sh
npm run dev
```
In order to add a new command to the bot please utilize:
```sh
node deploy-commands.js
```
