import { REST, Routes } from "discord.js";
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "../node_modules/@discordjs/builders/node_modules/discord-api-types/rest/v10/interactions.d.ts";
interface Config {
  clientId: string;
  guildId: string;
  token: string;
}

import configJson from "../config.json";
import { commands } from "./commands";
const config: Config = configJson as Config;

const restCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

for (const command of commands) {
  restCommands.push(command.toJSON());
}

console.log(`Total commands to deploy: ${restCommands.length}`);

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(config.token);

// and deploy your commands!
(async () => {
  try {
    console.log(
      `Started refreshing ${restCommands.length} application (/) commands.`,
    );

    // The put method is used to fully refresh all commands in the guild with the current set
    var data: any;

    data = await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
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
