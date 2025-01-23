import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { OverstatService } from "../../services/overstat";
import { AuthService } from "../../services/auth";
import { GuildMember } from "discord.js";

export class LinkOverstatCommand extends MemberCommand {
  inputNames = {
    overstat: "overstat",
    player: "player",
  };

  constructor(
    private authService: AuthService,
    private overstatService: OverstatService,
  ) {
    super("link-overstat", "Links an overstat page to a player");
    this.addStringInput(this.inputNames.overstat, "The overstat link", {
      isRequired: true,
    });
    this.addUserInput(this.inputNames.player, "@player", false);
  }

  async run(interaction: CustomInteraction) {
    const overstatUser = interaction.user;
    const link = interaction.options.getString(this.inputNames.overstat, true);
    const otherPlayer = interaction.options.getUser(
      this.inputNames.player,
      false,
    );
    await interaction.invisibleReply("Fetched all input, working on request");

    try {
      if (
        otherPlayer !== null &&
        !(await this.authService.memberIsAdmin(
          interaction.member as GuildMember,
        ))
      ) {
        await interaction.editReply(
          "Admin permissions not found for this user. You may only run this command for yourself.",
        );
      }

      const player = otherPlayer === null ? overstatUser : otherPlayer;

      await this.overstatService.addPlayerOverstatLink(player, link);
      await interaction.deleteReply();
      await interaction.followUp(`<@${player.id}>'s overstat set to ${link}`);
    } catch (error) {
      await interaction.editReply("Overstat not linked. " + error);
      return;
    }
  }
}
