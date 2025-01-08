import { AdminCommand } from "../../command";
import { CustomInteraction } from "../../interaction";
import { ScrimSignups } from "../../../services/signups";
import { AuthService } from "../../../services/auth";

export class ComputeScrimCommand extends AdminCommand {
  constructor(
    authService: AuthService,
    private signupService: ScrimSignups,
  ) {
    super(
      authService,
      "compute-scrim",
      "Creates a new scrim signup text channel",
    );
    this.addStringInput(
      "overstat-link",
      "Full length url of the completed scrim (not short url)",
      {
        isRequired: true,
        minLength: 30,
      },
    );
    this.addNumberInput("skill", "Skill level of the lobby");
  }

  async run(interaction: CustomInteraction) {
    await interaction.reply({
      content: "Fetched all input and working on your request!",
    });
    const channelId = interaction.channelId;
    const overstatLink = interaction.options.getString("overstat-link", true);
    const skill = interaction.options.getNumber("skill", true);

    try {
      await this.signupService.computeScrim(channelId, overstatLink, skill);
    } catch (error) {
      await interaction.editReply(`Scrim not computed. ${error}`);
    }

    await interaction.editReply(
      "Scrim lobby successfully computed, you can now compute another lobby or close the scrim",
    );
  }
}
