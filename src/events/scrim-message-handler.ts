import { Events, Message } from "discord.js";
import { signups } from "../services";

export const whitelistedCommands = new Set<string>([
  "/signup",
  "/signuplist",
  "/dropout",
]); // Add your whitelisted commands here

module.exports = {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (signups.getScrimId(message.channel.id as string)) {
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
