import { AdminCommand } from "../../command";
import { CustomInteraction } from "../../interaction";
import { AuthService } from "../../../services/auth";
import { BanService } from "../../../services/ban";

export class ExpungeBanCommand extends AdminCommand {
  constructor(
    authService: AuthService,
    private banService: BanService,
  ) {
    super(
      authService,
      "expunge-ban",
      "Removes a ban entry for up to three players",
    );
    this.addStringInput("ban-id1", "A DB id of a ban entry", {
      isRequired: true,
    });
    this.addStringInput("ban-id2", "A DB id of a ban entry", {
      isRequired: false,
    });
    this.addStringInput("ban-id3", "A DB id of a ban entry", {
      isRequired: false,
    });
  }

  async run(interaction: CustomInteraction) {
    const banId1 = interaction.options.getString("ban-id1", true);
    const banId2 = interaction.options.getString("ban-id2");
    const banId3 = interaction.options.getString("ban-id3");

    await interaction.editReply(
      "Fetched all input and working on your request!",
    );

    const bans: string[] = [banId1, banId2, banId3].filter(
      (ban) => ban !== null,
    );
    try {
      const expungedBans = await this.banService.expungeBans(bans);
      const expungeMessageArray = expungedBans.map(
        (ban) =>
          `Expunged ban on player <@${ban.id}> (${ban.name}) that was set to end on ${this.formatDate(ban.endDate)}`,
      );
      await interaction.deleteReply();
      await interaction.followUp(expungeMessageArray.join("\n"));
    } catch (e) {
      await interaction.editReply("Error while executing expunge ban. " + e);
      return;
    }
  }
}
