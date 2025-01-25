import { AdminCommand } from "../../command";
import { CustomInteraction } from "../../interaction";
import { ScrimSignups } from "../../../services/signups";
import { AuthService } from "../../../services/auth";

export class CloseScrimCommand extends AdminCommand {
  constructor(
    authService: AuthService,
    private signupService: ScrimSignups,
  ) {
    super(
      authService,
      "close-scrim",
      "Creates a new scrim signup text channel",
    );
  }

  async run(interaction: CustomInteraction) {
    const channel = interaction.channel;
    if (!channel) {
      interaction.editReply(
        "Scrim not closed. Could not get channel this command was sent in. " +
          channel,
      );
      return;
    }
    await interaction.editReply({
      content: "Fetched all input and working on your request!",
    });

    try {
      await this.signupService.closeScrim(channel.id);
    } catch (error) {
      await interaction.editReply("Scrim not closed. " + error);
      return;
    }

    await interaction.editReply(
      "Scrim closed. Deleting this channel in 5 seconds",
    );
    setTimeout(async () => {
      try {
        await channel.delete(
          "Scrim closed by " + interaction.member?.user.username,
        );
      } catch (error) {
        await interaction.editReply(
          "Scrim closed but channel could not be deleted. " + error,
        );
        return;
      }
    }, 5000);
  }
}
