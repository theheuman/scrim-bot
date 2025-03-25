import { GatewayIntentBits } from "discord.js";
import { ExtendedClient } from "./ExtendedClient";

export const client = new ExtendedClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
  ],
});
