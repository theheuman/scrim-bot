#  Void scrim bot
A multipurpose bot to track scrim signups, low prio and player performance among other things

## Usage

This bot has commands for admins and members

* [Members](/usage/members.md)
* [Admins](/usage/admins.md)

## Contributing
### Setup
Install dependencies
```sh
npm install
```

To run the tests, you'll need to add a config.json file to the root directory.

The file should contain:
```json
{
  "dev": {
    "lobbySize": 3,
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
    "lobbySize": 20,
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

Then you can run tests with 

`npm run test` or `npm run test:watch`

### Commands
All commands are in the commands directory and further information can be found in the README in that directory

They depend on services in the services/ directory that use the

## Deploying

### Test commands on a server

Install additional nhost server dependencies to run a local version of the database.
https://docs.nhost.io/development/cli/getting-started

Start nhost by going to the nhost/ directory and running `nhost up --apply-seeds`, you can then navigate to the dashboard link the command gives you to see that its running correctly

Before deploying test your new or updated commands on a private discord server, update your config.json file dev property with that servers discord info and insert necessary date into nhost (scrim_admin_roles and static_key_values.signup_channel).

Deploy commands to your private server with `npm run deploy-commands`

The bot can use hot reloads `npm run start:watch` or you can run it normally from the dist folder with `npm run start` (make sure to build first)

### Deploy to prod
After you verify everything is in working order you can run the prod deploy and start scripts

```sh
npm run deploy-commands:prod
```

Then you can run the production script with 
```sh
npm run start:prod
```

## Install on discord server:

bot permission integers: 395405503504
