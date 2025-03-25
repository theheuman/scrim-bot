import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { ScrimSignups } from "../../services/signups";
import { isGuildMember } from "../../utility/utility";
import { ScrimSignup } from "../../models/Scrims";
import { Player } from "../../models/Player";

export class SignupCommand extends MemberCommand {
  constructor(private signupService: ScrimSignups) {
    super("signup", "Creates a new scrim signup");
    this.addStringInput("teamname", "Team name", {
      isRequired: true,
      minLength: 1,
      maxLength: 25,
    });

    this.addUserInput("player1", "@player1", true);
    this.addUserInput("player2", "@player2", true);
    this.addUserInput("player3", "@player3", true);
  }

  async run(interaction: CustomInteraction) {
    const channelId = interaction.channelId;
    const teamName = interaction.options.getString("teamname", true);
    const signupPlayer = interaction.member;
    const player1 = interaction.options.getUser("player1", true);
    const player2 = interaction.options.getUser("player2", true);
    const player3 = interaction.options.getUser("player3", true);

    if (!isGuildMember(signupPlayer)) {
      await interaction.reply(
        "Team not signed up. Signup initiated by member that cannot be found. Contact admin",
      );
      return;
    }
    await interaction.reply("Fetched all input, working on request");

    let signup: ScrimSignup;
    try {
      signup = await this.signupService.addTeam(
        channelId as string,
        teamName,
        signupPlayer,
        [player1, player2, player3],
      );
      await interaction.editReply(
        `${teamName}\n<@${player1.id}>, <@${player2.id}>, <@${player3.id}>\nSigned up by <@${signupPlayer.id}>.\n${signup.signupId}`,
      );
    } catch (error) {
      await interaction.editReply("Team not signed up. " + error);
      return;
    }

    await this.warnMissingOverstat(signup.players, interaction);
  }

  private async warnMissingOverstat(
    players: Player[],
    interaction: CustomInteraction,
  ) {
    const overstatRequiredDeadline = new Date(1742799600000);

    const warnings = [];
    for (const player of players) {
      if (!player.overstatId) {
        warnings.push(`${player.displayName} is missing overstat id.`);
      }
    }
    if (warnings.length > 0) {
      await interaction.followUp({
        content: `${warnings.join("\n")}\nScrims starting after ${this.formatDate(overstatRequiredDeadline)} will reject signups that include players without overstat id. Use the /link-overstat command in https://discord.com/channels/1043350338574495764/1341877592139104376`,
        ephemeral: true,
      });
    }
  }
}
