import { CommandInteraction } from "discord.js";
import { Command } from "../command";

export class PingCommand extends Command {
  constructor() {
    super("ping", "Replies with Pong!");
  }

  async run(interaction: CommandInteraction): Promise<void> {
    await interaction.reply("Pong!");
  }
}
