import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { OverstatService } from "../../services/overstat";
import { AuthService } from "../../services/auth";
import { GuildMember } from "discord.js";


export class LinkOverstatCommand extends MemberCommand {
  inputNames = {
    overstat: "overstat",
    player: "player"
  };

  constructor(
    private overstatService: OverstatService,
    private authService: AuthService
  ) {
    super("addoverstat", "Links an overstat page to a player");
    this.addUserInput("overstat", "overstat_link", true);
    this.addUserInput("player", "@player", false);
  }

  async run(interaction: CustomInteraction) {
    const overstatUser = interaction.user;
    const link = interaction.options.getString("overstat", true);
    const otherPlayer = interaction.options.getUser("player", false);
    await interaction.reply("Fetched all input, working on request");

    try {
      if (otherPlayer !== null && !(await this.authService.memberIsAdmin(interaction.member as GuildMember)))
      {
        throw Error("Admin permissions not found for this user. You may only run this command for yourself.")
      }

      let player = otherPlayer === null ? overstatUser : otherPlayer;
      
      let playerId, shortenedLink = await this.overstatService.addPlayerOverstatLink(
        player, 
        link
      );
      await interaction.editReply(
        `<@${playerId}>'s overstat is ${shortenedLink}`,
      );
    } catch (error) {
      await interaction.editReply("Overstat not linked. " + error);
      return;
    }
  }
}
