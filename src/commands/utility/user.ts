import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { AlertService } from "../../services/alert";

export class UserCommand extends MemberCommand {
  constructor(alertService: AlertService) {
    super(alertService, "user", "Provides information about the user.");
  }

  async run(interaction: CustomInteraction): Promise<void> {
    const member = interaction.member;

    const joinedAt = member.joinedAt;
    if (joinedAt) {
      await interaction.reply(
        `This command was run by ${interaction.user.username}, who joined on ${joinedAt}.`,
      );
    } else {
      await interaction.reply(
        `This command was run by ${interaction.user.username}, but I couldn't determine when they joined.`,
      );
    }
  }
}
