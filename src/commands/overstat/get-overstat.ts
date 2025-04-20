import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { OverstatService } from "../../services/overstat";
import { AuthService } from "../../services/auth";
import { GuildMember } from "discord.js";

export class GetOverstatCommand extends MemberCommand {
  inputNames = {
    player: "player",
  };
  constructor(
    private authService: AuthService,
    private overstatService: OverstatService,
  ) {
    super("get-overstat", "Returns the overstat url for a given player");
    this.addUserInput("player", "@player", false);
  }

  async run(interaction: CustomInteraction) {
    const overstatUser = interaction.user;
    const otherPlayer = interaction.options.getUser("player", false);
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
        return;
      }

      const player = otherPlayer === null ? overstatUser : otherPlayer;

      const link = await this.overstatService.getPlayerOverstat(player);
      await interaction.editReply(`<@${player.id}>'s overstat is ${link}`);
    } catch (error) {
      await interaction.editReply("Could not fetch overstat. " + error);
      return;
    }
  }
}
