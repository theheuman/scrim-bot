import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { ScrimSignups } from "../../services/signups";
import { isGuildMember } from "../../utility/utility";
import { ScrimSignup } from "../../models/Scrims";
import { Player } from "../../models/Player";
import { PrioService } from "../../services/prio";

export class LeagueSignupCommand extends MemberCommand {
  teamNameInputName = "team-name";
  compExperienceInputName = "comp-experience";
  player1InputName = "player1";
  player2InputName = "player2";
  player3InputName = "player3";

  constructor(
    private signupService: ScrimSignups,
    private prioService: PrioService,
  ) {
    super("league-signup", "Signup for the league");
    this.addStringInput(this.teamNameInputName, "Team name", {
      isRequired: true,
      minLength: 1,
      maxLength: 25,
    });
    this.addIntegerInput(
      this.compExperienceInputName,
      "Your teams comp experience: 1 for none, 5 for extremely experienced",
      {
        isRequired: true,
        minValue: 1,
        maxValue: 5,
      },
    );

    this.addUserInput(this.player1InputName, "@player1", true);
    this.addUserInput(this.player2InputName, "@player2", true);
    this.addUserInput(this.player3InputName, "@player3", true);
  }

  async run(interaction: CustomInteraction) {
    const channelId = interaction.channelId;
    const teamName = interaction.options.getString(
      this.teamNameInputName,
      true,
    );
    const compExperience = interaction.options.getInteger(
      this.compExperienceInputName,
      true,
    );
    const signupPlayer = interaction.member;
    const player1 = interaction.options.getUser(this.player1InputName, true);
    const player2 = interaction.options.getUser(this.player2InputName, true);
    const player3 = interaction.options.getUser(this.player3InputName, true);

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
    const scrim = this.signupService.getScrim(interaction.channelId);
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
