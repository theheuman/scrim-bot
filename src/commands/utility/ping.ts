import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";

export class PingCommand extends MemberCommand {
  constructor() {
    super("ping", "Replies with Pong!");
  }

  async run(interaction: CustomInteraction): Promise<void> {
    await interaction.reply("Pong!");
  }
}
