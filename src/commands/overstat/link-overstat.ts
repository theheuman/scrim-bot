import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { OverstatService } from "../../services/overstat";
import { AuthService } from "../../services/auth";
import { AlertService } from "../../services/alert";
import { GuildMember } from "discord.js";

export class LinkOverstatCommand extends MemberCommand {
  inputNames = {
    overstat: "overstat",
    player: "player",
  };

  constructor(
    alertService: AlertService,
    private authService: AuthService,
    private overstatService: OverstatService,
  ) {
    super(
      alertService,
      "link-overstat",
      "Links an overstat overview url to a player",
    );
    this.addStringInput(this.inputNames.overstat, "The overstat link", {
      isRequired: true,
    });
    this.addUserInput(this.inputNames.player, "@player", false);
  }

  async run(interaction: CustomInteraction) {
    const commandUser = interaction.user;
    const link = interaction.options.getString(this.inputNames.overstat, true);
    const otherPlayer = interaction.options.getUser(this.inputNames.player);
    await interaction.invisibleReply("Fetched all input, working on request");

    const tryingToAssignSomeoneElse = otherPlayer?.id
      ? otherPlayer.id !== commandUser.id
      : false;

    try {
      console.log("Trying to assign someone else", tryingToAssignSomeoneElse);
      if (
        tryingToAssignSomeoneElse &&
        !(await this.authService.memberIsAdmin(
          interaction.member as GuildMember,
        ))
      ) {
        console.log("Killing interaction");
        await interaction.editReply(
          "Admin permissions not found for this user. You may only run this command for yourself.",
        );
        return;
      }

      console.log("Interaction continuing");
      const player = otherPlayer === null ? commandUser : otherPlayer;

      await this.overstatService.addPlayerOverstatLink(player, link);
      await interaction.deleteReply();
      await interaction.followUp(`<@${player.id}>'s overstat set to ${link}`);
    } catch (error) {
      await interaction.editReply("Overstat not linked. " + error);
      return;
    }
  }
}
