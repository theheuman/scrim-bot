import { AdminCommand } from "../../../command";
import { CustomInteraction } from "../../../interaction";
import { ScrimSignups } from "../../../../services/signups";
import { AuthService } from "../../../../services/auth";

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
    this.addStringInput(
      "overstat-link-2",
      "Second full length url of the completed scrim (not short url)",
      {
        isRequired: false,
        minLength: 30,
      },
    );
    this.addStringInput(
      "overstat-link-3",
      "Third full length url of the completed scrim (not short url)",
      {
        isRequired: false,
        minLength: 30,
      },
    );
  }

  async run(interaction: CustomInteraction) {
    const channelId = interaction.channelId;
    const overstatLink = interaction.options.getString("overstat-link", true);
    const overstatLinkTwo = interaction.options.getString("overstat-link-2");
    const overstatLinkThree = interaction.options.getString("overstat-link-3");
    const overstatLinks: string[] = [
      overstatLink,
      overstatLinkTwo,
      overstatLinkThree,
    ].filter((link) => link !== undefined && link !== null);
    await interaction.editReply({
      content: "Fetched all input and working on your request!",
    });

    try {
      const linksComputed = await this.signupService.computeScrim(
        channelId,
        overstatLinks,
      );
      await interaction.deleteReply();
      const prefix =
        linksComputed.length === 1 ? "scrim lobby" : "scrim lobbies";
      await interaction.followUp(
        `${linksComputed.length} ${prefix} successfully computed, you can now close the scrim`,
      );
    } catch (error) {
      await interaction.editReply(`Scrim not computed. ${error}`);
    }
  }
}
