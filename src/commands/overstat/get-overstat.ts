import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { OverstatService } from "../../services/overstat";
import { AuthService } from "../../services/auth";
import { GuildMember } from "discord.js";


export class GetOverstatCommand extends MemberCommand {
    inputNames = {
        player: "player"
    };
  constructor(
    private overstatService: OverstatService,
    private authService: AuthService
  ) {
    super("getoverstat", "Returns the overstat for a given player");
    this.addUserInput("player", "@player", false);
  }

  async run(interaction: CustomInteraction) {
    const overstatUser = interaction.user;
    const otherPlayer = interaction.options.getUser("player", false);
    await interaction.reply("Fetched all input, working on request");

    try {
        if (otherPlayer !== null && !(await this.authService.memberIsAdmin(interaction.member as GuildMember)))
        {
            throw Error("Admin permissions not found for this user. You may only run this command for yourself.")
        }

        let player = otherPlayer === null ? overstatUser : otherPlayer;

        let  playerId, link = await this.overstatService.getPlayerOverstat(player);
        await interaction.editReply(`<@${playerId}>'s overstat is ${link}`,);
    } catch (error) {
      await interaction.editReply("Overstat not provided. " + error);
      return;
    }
  }
}
