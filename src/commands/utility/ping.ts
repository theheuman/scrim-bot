import { CommandInteraction } from "discord.js";
import { MemberCommand } from "../command";

export class PingCommand extends MemberCommand {
  constructor() {
    super("ping", "Replies with Pong!");
  }

  async run(interaction: CommandInteraction): Promise<void> {
    await interaction.reply("Pong!");
  }
}
