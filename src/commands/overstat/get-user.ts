import { AdminCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { OverstatService } from "../../services/overstat";
import { AuthService } from "../../services/auth";

export class GetUserCommand extends AdminCommand {
  inputNames = {
    overstatLink: "overstat-link",
  };
  constructor(
    authService: AuthService,
    private overstatService: OverstatService,
  ) {
    super(
      authService,
      "get-user",
      "Returns the player (if exists) for a given overstat link",
    );
    this.addStringInput(
      this.inputNames.overstatLink,
      "Overstat url to search for a linked user",
      { isRequired: true },
    );
  }

  async run(interaction: CustomInteraction) {
    const overstatLink = interaction.options.getString(
      this.inputNames.overstatLink,
      true,
    );
    await interaction.editReply("Fetched all input, working on request");

    try {
      const player =
        await this.overstatService.getPlayerFromOverstatLink(overstatLink);
      if (!player) {
        await interaction.editReply(
          `No user found with overstat: ${overstatLink}`,
        );
      } else {
        await interaction.editReply(
          `${overstatLink} is linked to <@${player.discordId}>`,
        );
      }
    } catch (error) {
      await interaction.editReply(
        "Could not fetch user for overstat. " + error,
      );
      return;
    }
  }
}
