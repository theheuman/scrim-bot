import * as path from "node:path";
import * as fs from "node:fs";
import { GatewayIntentBits } from "discord.js";
import ExtendedClient from "./ExtendedClient";
import { commands } from "./commands";
import { appConfig } from "./config";

const client = new ExtendedClient({ intents: [GatewayIntentBits.Guilds] });

for (const command of commands) {
  client.commands.set(command.name, command);
}

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

client.login(appConfig.discord.token);
