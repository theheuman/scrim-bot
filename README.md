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
    "lobbySize": 20,
    "discord": {
      "token": "DISCORD_BOT_TOKEN",
      "clientId": "DISCORD_CLIENT_ID",
      "guildId": "DISCORD_GUILD_ID"
    },
    "nhost": {
      "adminSecret": "NHOST_SECRET",
      "subdomain": "NHOST_SUBDOMAIN",
      "region": "NHOST_REGION"
    }
  }
}
```
Where DISCORD_BOT_TOKEN is the bot token taken from the discord application portal bot page
DISCORD_CLIENT_ID is the application ID from the discord application portal general information page
DISCORD_GUILD_ID is the server ID of the server the bot is running in

You can create a template config file by running
`
npm run create-config
`
This script will default to generic placeholders but can use environment variables of the same name to fill in values. The script will warn you which variables are missing and you can re run it to get the correct values.

Then you can run tests with 

`npm run test` or `npm run test:watch`

### Commands
All commands are in the commands directory and further information can be found in the README in that directory

They depend on services in the services/ directory

## Deploying

The `main` branch is tracked heroku and automatically deploys.

### Test commands on a server

Install additional nhost server dependencies to run a local version of the database.
https://docs.nhost.io/development/cli/getting-started

Start nhost by going to the nhost/ directory and running `nhost up --apply-seeds`, you can then navigate to the dashboard link the command gives you to see that its running correctly

Before merge to main test your new or updated commands on a private discord server, update your config.json file dev property with that servers discord info and insert necessary data into nhost (scrim_admin_roles and static_key_values.signup_channel).

Deploy commands to your private server with `npm run deploy-commands`

The bot can use hot reloads `npm run start:watch` or you can run it normally from the dist folder with `npm run start` (make sure to build first)

### Deploy to prod

After merge to main heroku will automatically start a new build. This build consists of the `heroku-prebuild` script in package.json, it then runs `npm install` and `npm run build` on its own, before running the worker specified in the `Procfile` and finally runs the release task in the same Procfile to deploy the commands

## Install on discord server:

bot permission integers: 395405503504
