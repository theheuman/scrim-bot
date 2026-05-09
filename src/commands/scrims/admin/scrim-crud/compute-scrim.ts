import { AdminCommand } from "../../../command";
import { CustomInteraction } from "../../../interaction";
import { ScrimService } from "../../../../services/scrim-service";
import { AuthService } from "../../../../services/auth";
import { AlertService } from "../../../../services/alert";
import { DiscordService } from "../../../../services/discord";
import { OverstatService } from "../../../../services/overstat";

export class ComputeScrimCommand extends AdminCommand {
  constructor(
    alertService: AlertService,
    authService: AuthService,
    private scrimService: ScrimService,
    private discordService: DiscordService,
    private overstatService: OverstatService,
  ) {
    super(
      alertService,
      authService,
      "compute-scrim",
      "Computes stats for this scrim",
    );
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
      const { links: linksComputed, dateTime } =
        await this.scrimService.computeScrim(channelId, overstatLinks);
      await interaction.deleteReply();
      const prefix =
        linksComputed.length === 1 ? "scrim lobby" : "scrim lobbies";
      await interaction.followUp(
        `${linksComputed.length} ${prefix} successfully computed, you can now close the scrim`,
      );
      await this.sendScoresComputedMessage(
        interaction,
        dateTime,
        linksComputed,
      );
    } catch (error) {
      await interaction.editReply(`Scrim not computed. ${error}`);
    }
  }

  private async sendScoresComputedMessage(
    interaction: CustomInteraction,
    dateTime: Date,
    links: string[],
  ) {
    const lobbies = links.map((link) => ({
      name: this.overstatService.getLobbyName(link),
      link,
    }));
    try {
      await this.discordService.sendScoresComputedMessage(dateTime, lobbies);
    } catch (error) {
      await interaction.followUp(
        `Warning: Failed to send scores notification. ${error}`,
      );
    }
  }
}
