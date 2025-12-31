import { REST, Routes } from "discord.js";
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "../node_modules/discord-api-types/rest/v10/interactions.d.ts";

import {
  commonCommands,
  scrimCommands,
  leagueCommands,
  commands,
} from "./commands";
import { appConfig } from "./config";

const restCommonCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[] =
  [];
const restScrimCommand: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
const restLeagueCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[] =
  [];

for (const command of commonCommands) {
  restCommonCommands.push(command.toJSON());
}
for (const command of scrimCommands) {
  restScrimCommand.push(command.toJSON());
}
for (const command of leagueCommands) {
  restLeagueCommands.push(command.toJSON());
}

console.log(
  `Total commands to deploy:\nScrim: ${commonCommands.length + scrimCommands.length}\nLeague: ${commonCommands.length + leagueCommands.length}`,
);

const discordConfig = appConfig.discord;
// Construct and prepare an instance of the REST module
const rest = new REST().setToken(discordConfig.token);

const deployAllCommands = async () => {
  try {
    const scrimData: any = await rest.put(
      Routes.applicationGuildCommands(
        discordConfig.clientId,
        discordConfig.guildId.scrim,
      ),
      { body: [...restCommonCommands, ...restScrimCommand] },
    );
    console.log(
      `Successfully reloaded ${scrimData.length} application (/) commands to scrim cord.`,
    );

    const leagueData: any = await rest.put(
      Routes.applicationGuildCommands(
        discordConfig.clientId,
        discordConfig.guildId.league,
      ),
      { body: [...restCommonCommands, ...restLeagueCommands] },
    );

    console.log(
      `Successfully reloaded ${leagueData.length} application (/) commands to league cord.`,
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
};

const deployDevCommands = async () => {
  try {
    console.log(
      `Detected dev case, deploying full set of commands to one cord: ${commands.length}`,
    );
    const restFullCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[] =
      commands.map((command) => command.toJSON());
    const fullData: any = await rest.put(
      Routes.applicationGuildCommands(
        discordConfig.clientId,
        discordConfig.guildId.league,
      ),
      { body: restFullCommands },
    );
    console.log(
      `Successfully reloaded ${fullData.length} application (/) commands to dev cord.`,
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
};

if (discordConfig.guildId.league === discordConfig.guildId.scrim) {
  deployDevCommands();
} else {
  deployAllCommands();
}
