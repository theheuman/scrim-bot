import { ScrimSignup } from "../../../models/Scrims";
import { AdminCommand } from "../../command";
import { CustomInteraction } from "../../interaction";
import { ScrimSignups } from "../../../services/signups";
import { AuthService } from "../../../services/auth";
import * as fs from "node:fs";

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
    await interaction.editReply("Fetching teams, command in progress");

    const channelId = interaction.channelId;

    let channelSignups: { mainList: ScrimSignup[]; waitList: ScrimSignup[] };
    try {
      channelSignups = await this.signupService.getSignups(channelId);
    } catch (e) {
      await interaction.editReply(`Could not fetch signups. ${e}`);
      return;
    }

    const { mainList, waitList } = channelSignups;

    const mainListString = `Main list.\n${this.formatTeams(mainList)}`;

    await this.replyWithString(interaction, mainListString);

    if (waitList.length > 0) {
      const waitListString = `Wait list.\n${this.formatTeams(waitList)}`;
      await this.replyWithString(interaction, waitListString);
    }

    try {
      const fileName = await this.generateCsv(channelId, mainList, waitList);
      await interaction.followUp({
        files: [{ attachment: fileName, name: "signups.csv" }],
        ephemeral: true,
      });
      fs.unlink(fileName, () => null);
    } catch (e) {
      await interaction.editReply("Problem generating csv. " + e);
    }
  }

  // Break long strings into chunks for discord
  async replyWithString(interaction: CustomInteraction, replyString: string) {
    let stringToReplyWith = replyString;
    while (stringToReplyWith.length > 0) {
      // discords max reply length is 2000
      let cutoffIndex =
        stringToReplyWith.length > 2000 ? 2000 : stringToReplyWith.length;
      let charAtIndex = stringToReplyWith.charAt(cutoffIndex - 1);
      while (charAtIndex !== "\n") {
        cutoffIndex--;
        charAtIndex = stringToReplyWith.charAt(cutoffIndex - 1);
      }
      const message = stringToReplyWith.substring(0, cutoffIndex);
      try {
        await interaction.followUp({ content: message, ephemeral: true });
      } catch (e) {
        await interaction.followUp({
          content: "error sending part of response " + e,
          ephemeral: true,
        });
      }
      stringToReplyWith = stringToReplyWith.substring(cutoffIndex);
    }
  }

  formatTeams(teams: ScrimSignup[]): string {
    return teams.map((team) => this.formatTeam(team)).join("\n") + "\n";
  }

  // string returned is the file location
  async generateCsv(
    channelId: string,
    mainList: ScrimSignup[],
    waitList: ScrimSignup[],
  ): Promise<string> {
    const teamCsvStringConverter = (team: ScrimSignup) => {
      return team.players.map((player) => player.displayName).join(",");
    };
    const mainListString = mainList.map(teamCsvStringConverter).join("\n");
    const seperator = "\n,,\n";
    const waitListString = waitList.map(teamCsvStringConverter).join("\n");
    const content = mainListString + seperator + waitListString;
    const fileName = "temp-signup-" + channelId + ".csv";
    fs.writeFileSync(fileName, content);
    return fileName;
  }
}
