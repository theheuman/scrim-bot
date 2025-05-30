import { AdminCommand } from "../../command";
import { CustomInteraction } from "../../interaction";
import { ScrimSignups } from "../../../services/signups";
import { AuthService } from "../../../services/auth";

export class ComputeScrimCommand extends AdminCommand {
  constructor(
    authService: AuthService,
    private signupService: ScrimSignups,
  ) {
    super(authService, "compute-scrim", "Computes stats for this scrim");
    this.addStringInput(
      "overstat-link",
      "Full length url of the completed scrim (not short url)",
      {
        isRequired: true,
        minLength: 30,
      },
    );
    this.addNumberInput("skill", "Skill level of the lobby", true);
  }

  async run(interaction: CustomInteraction) {
    const channelId = interaction.channelId;
    const overstatLink = interaction.options.getString("overstat-link", true);
    const skill = interaction.options.getNumber("skill", true);
    await interaction.editReply({
      content: "Fetched all input and working on your request!",
    });

    try {
      await this.signupService.computeScrim(channelId, overstatLink, skill);
      await interaction.deleteReply();
      await interaction.followUp(
        "Scrim lobby successfully computed, you can now compute another lobby or close the scrim",
      );
    } catch (error) {
      await interaction.editReply(`Scrim not computed. ${error}`);
    }
  }
}
