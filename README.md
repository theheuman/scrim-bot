#  Void scrim bot
A multipurpose bot to track scrim signups, low prio and player performance among other things

## Usage

This bot has commands for admins and members

### Members

Commands any member can use

#### /signup
Signup for the scrim

Can only be used in a scrim signup post created by the bot

Fill out the required fields: team name, player 1, player 2, and player 3 

#### /dropout
Drop out of the scrim

Can only be used in a scrim signup post created by the bot
Will only work if you are a player on the team or signed up the team that you are trying to dropout

Fill out the required field: team name

#### /change-team-name
Change your team name for the scrim

Can only be used in a scrim signup post created by the bot
Will only work if you are a player on the team or signed up the team that you are trying to dropout

Fill out the required fields: old team name, new team name

#### /sub-player
Sub a player for a different player

Can only be used in a scrim signup post created by the bot

Will only work if you are a player on the team or signed up the team that you are trying to dropout

Fill out the required fields: team name, old player, new player

#### /link-overstat
Links an overstat to your discord account

Can be used in a specific bot channel #link-overstat

Fill out the required fields: overstat-link

If you are an admin you can link a player other than yourself by filling out the optional user field

### Admins
Commands only member can use

#### /create-scrim
Creates a scrim, creates the associated signup post in the forum specified when calling the command


Please use #bot-handling in area-51 for now to run this command


Fill out the required fields: Forum to post it in, datetime ( mm/dd hha. Ex: 1/26 8pm)

Optionally add a name to it, this will be appended to the date in the name of the scrim signup. Something like ED/WE to specify the maps

#### /get-signups
Get the signups for a scrim, only sends the list to the user calling the command, no one else can see it

Can only be used in a signup post created by the bot

#### /compute-scrim
Computes stats for the scrim, any overstat accounts linked to discord accounts will have stats generated for them weighted to the lobby strength if sent.

This command can be used multiple times in the same signup post if there are multiple lobbies


Can only be used in a signup post created by the bot


Fill out the required fields: full overstat link (not shortened)

Optionally add skill to it so it can be weighted properly

Skill map
```
League | skill | scrim
Div 1  |   1   |
       |   2   |	Lobby 1
Div 2  |   3   |
Div 3  |   5   |	Scrim 2
Div 4  |   6   |	Scrim 3
Div 5  |   7   |
```

#### /close-scrim
Close the scrim, deletes the post and sets the scrim to not active.
Only run this after computing the scrim

Can only be used in a signup post created by the bot

#### /add-prio
Add a prio entry to up to three players

Please use the usual low prio channel

Fill out the required fields: amount (negative for low prio), reason, player 1, end date

Start date defaults to the current eastern date, but can be specified with the start date option

Optionally add player 2 and player 3

#### /expunge-prio
Expunge up to three prio entries. This deletes a specific entry, it does not remove all prio from a player

Please use the usual low prio channel

Fill out the required fields: reason, prio id 1. The id can be found in the response to the command where prio was added

Optionally add prio id 2 and prio id 3

#### /add-admin-role
Adds a discord role that can use the bots admin commands

Please use #bot-handling

Fill out the required field: role

#### /remove-admin-rle
Remove a discord role from being able to use the bots admin commands

Please use #bot-handling

Fill out the required field: role

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
