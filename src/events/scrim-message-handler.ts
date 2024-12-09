import { Events, Message } from "discord.js";
import { signupsService } from "../services";

// TODO I'm not sure what this file's purpose is, it seems like it is a filter to delete all messages that aren't bot commands
export const whitelistedCommands = new Set<string>([
  "/signup",
  "/signuplist",
  "/dropout",
]); // Add your whitelisted commands here

module.exports = {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (signupsService.getScrimId(message.channel.id as string)) {
      console.log("Scrim signup channel message detected");
      if (!whitelistedCommands.has(message.content)) {
        const botReply = await message.reply(
          "Please use the bot commands for scrim signups.",
        );

        setTimeout(async () => {
          await message.delete();
          await botReply.delete();
          await message.author.send("Hello world");
        }, 15000); // 15 seconds in milliseconds
      }
    }
  },
};
