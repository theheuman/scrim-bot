# Admin Commands
Commands only admins can use.

The general flow:

* Signup post is created with the /create-scrim command
* When lobby sorting is to begin /get-signups is called to get all the teams (low prio teams are automatically moved to wait list)
* When scrim is completed /compute-scrim is ran to collate all stats for the players in the scrim, this can be ran multiple times if scrim has multiple lobbies
* After all lobbies have been computed you can use /close-scrim to delete the signup post (this is a destructive command, you will not be able to compute after closing)

## /create-scrim
Creates a scrim, creates the associated signup post in the forum specified when calling the command

![Create scrim](/usage/assets/admins/create-scrim.png)
![Create scrim success](/usage/assets/admins/create-scrim-success.png)

Please use #bot-handling in area-51 for now to run this command

Fill out the required fields: Forum to post it in, datetime ( mm/dd hha. Ex: 1/26 8pm)

The bot is programmed to take eastern time

Optionally add a name to it, this will be appended to the date in the name of the scrim signup. Something like ED/WE to specify the maps

## /get-signups
Get the signups for a scrim, only sends the list to the user calling the command, no one else can see it


![Get signups](/usage/assets/admins/get-signups.png)
![Get signups success](/usage/assets/admins/get-signups-success.png)

In addition to replying with all the teams it also returns a csv, you can download this csv and then import it into a google sheet by using `file -> import -> select your downloaded file -> and then choosing "append to current sheet" for import location`

![Google sheet import](/usage/assets/admins/get-signups-google.png)

Can only be used in a signup post created by the bot

## /compute-scrim
Computes stats for the scrim, any overstat accounts linked to discord accounts will have stats generated for them weighted to the lobby strength.

This command can be used multiple times in the same signup post if there are multiple lobbies

![Compute scrim](/usage/assets/admins/compute-scrim.png)
![Compute scrim success](/usage/assets/admins/compute-scrim-success.png)

Can only be used in a signup post created by the bot


Fill out the required fields: full overstat link (not shortened), skill (see below table for skill for each type of lobby)

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

## /close-scrim
Close the scrim, deletes the post and sets the scrim to not active.
Only run this after computing the scrim

![Close scrim](/usage/assets/admins/close-scrim.png)
![Close scrim success](/usage/assets/admins/close-scrim-success.png)

Can only be used in a signup post created by the bot

## /add-prio
Add a prio entry to up to three players

Please use the usual low prio channel

![Add prio](/usage/assets/admins/add-prio.png)
![Add prio success](/usage/assets/admins/add-prio-success.png)

Fill out the required fields: amount (negative for low prio), reason, player 1, end date

Start date defaults to the current eastern date, but can be specified with the start date option

Optionally add player 2 and player 3

## /expunge-prio
Expunge up to three prio entries. This deletes a specific entry, it does not remove all prio from a player

Please use the usual low prio channel

![Expunge prio](/usage/assets/admins/expunge-prio.png)
![Expunge prio success](/usage/assets/admins/expunge-prio-success.png)

Fill out the required fields: reason, prio id 1. The id can be found in the response to the command where prio was added

Optionally add prio id 2 and prio id 3

## /add-admin-role
Adds a discord role that can use the bots admin commands

Please use #bot-handling

Fill out the required field: role

## /remove-admin-role
Remove a discord role from being able to use the bots admin commands

Please use #bot-handling

Fill out the required field: role
