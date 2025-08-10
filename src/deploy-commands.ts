import { REST, Routes } from "discord.js";
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "../node_modules/discord-api-types/rest/v10/interactions.d.ts";

import { commands } from "./commands";
import { appConfig } from "./config";

const restCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

for (const command of commands) {
  restCommands.push(command.toJSON());
}

console.log(`Total commands to deploy: ${restCommands.length}`);

const discordConfig = appConfig.discord;
// Construct and prepare an instance of the REST module
const rest = new REST().setToken(discordConfig.token);

// and deploy your commands!
(async () => {
  try {
    console.log(
      `Started refreshing ${restCommands.length} application (/) commands.`,
    );

    // The put method is used to fully refresh all commands in the guild with the current set
    var data: any;

    data = await rest.put(
      Routes.applicationGuildCommands(
        discordConfig.clientId,
        discordConfig.guildId,
      ),
      { body: restCommands },
    );

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`,
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();
