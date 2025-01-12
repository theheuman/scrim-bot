import { ScrimSignup } from "../../../models/Scrims";
import { AdminCommand } from "../../command";
import { CustomInteraction } from "../../interaction";
import { ScrimSignups } from "../../../services/signups";
import { AuthService } from "../../../services/auth";
import { Player } from "../../../models/Player";

export class GetSignupsCommand extends AdminCommand {
  constructor(
    authService: AuthService,
    private signupService: ScrimSignups,
  ) {
    super(
      authService,
      "get-signups",
      "Creates a new scrim signup text channel",
    );
  }

  async run(interaction: CustomInteraction) {
    // Before executing any other code, we need to acknowledge the interaction.
    // Discord only gives us 3 seconds to acknowledge an interaction before
    // the interaction gets voided and can't be used anymore.
    await interaction.reply("Fetching teams, command in progress");

    const channelId = interaction.channelId;

    let channelSignups: { mainList: ScrimSignup[]; waitList: ScrimSignup[] };
    try {
      channelSignups = await this.signupService.getSignups(channelId);
    } catch (e) {
      await interaction.editReply(`Could not fetch signups. ${e}`);
      return;
    }

    const { mainList, waitList } = channelSignups;

    const message = `Main list.\n${this.formatTeams(mainList)}\n\n\nWait list.\n${this.formatTeams(waitList)}`;
    await interaction.editReply(message);
  }

  formatTeams(teams: ScrimSignup[]) {
    return teams.map((team) => this.formatTeam(team)).join("\n");
  }

  formatTeam(team: ScrimSignup) {
    const playerString = team.players
      .map((player) => this.formatPlayer(player))
      .join(" ");
    const teamString = `${team.teamName}. Signed up by: ${this.formatPlayer(team.signupPlayer)}. Players: ${playerString}.`;
    const prioString = team.prio
      ? ` Prio: ${team.prio.amount}. ${team.prio.reasons}.`
      : "";
    return teamString + prioString;
  }

  formatPlayer(player: Player) {
    return `<@${player.id}>`;
  }
}
