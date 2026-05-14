import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { AlertService } from "../../services/alert";

export class PingCommand extends MemberCommand {
  constructor(alertService: AlertService) {
    super(alertService, "ping", "Replies with Pong!");
  }

  async run(interaction: CustomInteraction): Promise<void> {
    await interaction.reply("Pong!");
  }
}
