import { AdminCommand } from "../../command";
import { CustomInteraction } from "../../interaction";
import { ScrimSignups } from "../../../services/signups";
import { AuthService } from "../../../services/auth";
import { ForumThreadChannel } from "discord.js/typings";

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
    // Before executing any other code, we need to acknowledge the interaction.
    // Discord only gives us 3 seconds to acknowledge an interaction before
    // the interaction gets voided and can't be used anymore.
    await interaction.reply({
      content: "Fetched all input and working on your request!",
    });
    const channel = interaction.channel as ForumThreadChannel;

    try {
      await this.signupService.closeScrim(channel.id);
    } catch (error) {
      interaction.editReply("Scrim not closed. " + error);
      return;
    }

    interaction.editReply("Scrim closed. Deleting this channel in 5 seconds");
    setTimeout(() => {
      channel.delete("Scrim closed by " + interaction.member?.user.username);
    }, 5000);
  }
}
