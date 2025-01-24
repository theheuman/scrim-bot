# Admin Commands
Commands only admins can use

## /create-scrim
Creates a scrim, creates the associated signup post in the forum specified when calling the command


Please use #bot-handling in area-51 for now to run this command


Fill out the required fields: Forum to post it in, datetime ( mm/dd hha. Ex: 1/26 8pm)

Optionally add a name to it, this will be appended to the date in the name of the scrim signup. Something like ED/WE to specify the maps

## /get-signups
Get the signups for a scrim, only sends the list to the user calling the command, no one else can see it

Can only be used in a signup post created by the bot

## /compute-scrim
Computes stats for the scrim, any overstat accounts linked to discord accounts will have stats generated for them weighted to the lobby strength.

This command can be used multiple times in the same signup post if there are multiple lobbies


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

Can only be used in a signup post created by the bot

## /add-prio
Add a prio entry to up to three players

Please use the usual low prio channel

Fill out the required fields: amount (negative for low prio), reason, player 1, end date

Start date defaults to the current eastern date, but can be specified with the start date option

Optionally add player 2 and player 3

## /expunge-prio
Expunge up to three prio entries. This deletes a specific entry, it does not remove all prio from a player

Please use the usual low prio channel

Fill out the required fields: reason, prio id 1. The id can be found in the response to the command where prio was added

Optionally add prio id 2 and prio id 3

## /add-admin-role
Adds a discord role that can use the bots admin commands

Please use #bot-handling

Fill out the required field: role

## /remove-admin-rle
Remove a discord role from being able to use the bots admin commands

Please use #bot-handling

Fill out the required field: role
