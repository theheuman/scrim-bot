import { MemberCommand } from "../../command";
import { CustomInteraction } from "../../interaction";
import { SignupService } from "../../../services/signups";
import { isGuildMember } from "../../../utility/utility";
import { ScrimSignup } from "../../../models/Scrims";
import { Player } from "../../../models/Player";
import { PrioService } from "../../../services/prio";
import { ScrimService } from "../../../services/scrim-service";

export class SignupCommand extends MemberCommand {
  constructor(
    private signupService: SignupService,
    private prioService: PrioService,
    private scrimService: ScrimService,
  ) {
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
    await interaction.invisibleReply("Fetched all input, working on request");

    let signup: ScrimSignup;
    try {
      signup = await this.signupService.addTeam(
        channelId as string,
        teamName,
        signupPlayer,
        [player1, player2, player3],
      );
      await interaction.followUp(
        `${teamName}\n<@${player1.id}>, <@${player2.id}>, <@${player3.id}>\nSigned up by <@${signupPlayer.id}>.\n${signup.signupId}`,
      );
    } catch (error) {
      await interaction.editReply("Team not signed up. " + error);
      return;
    }

    await this.warnMissingOverstat(signup.players, interaction);
    await this.warnPrioEntries(interaction, signup);
  }

  private async warnMissingOverstat(
    players: Player[],
    interaction: CustomInteraction,
  ) {
    const warnings = [];
    for (const player of players) {
      if (!player.overstatId) {
        warnings.push(`${player.displayName} is missing overstat id.`);
      }
    }
    if (warnings.length > 0) {
      await interaction.followUp({
        content: `Your admin role overrode missing overstats.\n${warnings.join("\n")}`,
        ephemeral: true,
      });
    }
  }

  private async warnPrioEntries(
    interaction: CustomInteraction,
    signup: ScrimSignup,
  ) {
    const scrim = await this.scrimService.getScrim(interaction.channelId);
    if (!scrim) {
      console.error(
        "Unable to get applicable prio on a signup because there is no scrim for this channel",
      );
      return;
    }
    const scrimSignupsWithPrio = await this.prioService.getTeamPrioForScrim(
      scrim,
      [signup],
      [],
    );
    const teamPrio = scrimSignupsWithPrio[0]?.prio;
    if (teamPrio?.reasons) {
      const prioMessage = `${teamPrio.reasons}\nTotal prio amount: ${teamPrio.amount}`;
      await interaction.followUp({
        content:
          "This team has prio entries which will be in effect for the scrim.\n" +
          prioMessage,
        ephemeral: true,
      });
    }
  }
}
