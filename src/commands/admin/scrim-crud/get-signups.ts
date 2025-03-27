import { ScrimSignup } from "../../../models/Scrims";
import { AdminCommand } from "../../command";
import { CustomInteraction } from "../../interaction";
import { ScrimSignups } from "../../../services/signups";
import { AuthService } from "../../../services/auth";
import * as fs from "node:fs";
import { StaticValueService } from "../../../services/static-values";
import { Player } from "../../../models/Player";
import { getPlayerOverstatUrl } from "../../../services/overstat";

export class GetSignupsCommand extends AdminCommand {
  constructor(
    authService: AuthService,
    private signupService: ScrimSignups,
    private staticValueService: StaticValueService,
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
    const scrimPassMemberIds: string[] =
      await this.getScrimPassMemberIds(interaction);
    const channelId = interaction.channelId;

    let channelSignups: { mainList: ScrimSignup[]; waitList: ScrimSignup[] };
    try {
      channelSignups = await this.signupService.getSignups(
        channelId,
        scrimPassMemberIds,
      );
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

  async getScrimPassMemberIds(
    interaction: CustomInteraction,
  ): Promise<string[]> {
    const scrimPassRoleId = await this.staticValueService.getScrimPassRoleId();
    let scrimPassMemberIds: string[] = [];
    if (scrimPassRoleId) {
      const scrimPassRole = await interaction.guild?.roles.fetch(
        scrimPassRoleId,
        {
          cache: true,
          force: true,
        },
      );
      if (scrimPassRole) {
        scrimPassMemberIds = [...scrimPassRole.members].map(
          (collectionItem) => collectionItem[0],
        );
      } else {
        console.error(
          "Can't fetch scrim pass role members from discord for: guild, role id",
          interaction.guild,
          scrimPassRoleId,
        );
        await interaction.editReply(
          "Can't fetch scrim pass role members from discord",
        );
      }
    } else {
      console.error("Unable to get scrim pass role id from db");
      await interaction.editReply("Unable to get scrim pass role id from db");
    }
    return scrimPassMemberIds;
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
      const teamNameColumn = `${team.teamName} ${this.formatPlayer(team.players[0])}`;
      const playerColumns = team.players.map(this.getPlayerCsvFields);
      return [teamNameColumn, ...playerColumns].join(",");
    };
    const mainListString = mainList.map(teamCsvStringConverter).join("\n");
    const separator = "\n,,,\n";
    const waitListString = waitList.map(teamCsvStringConverter).join("\n");
    const content = mainListString + separator + waitListString;
    const fileName = "temp-signup-" + channelId + ".csv";
    fs.writeFileSync(fileName, content);
    return fileName;
  }

  getPlayerCsvFields(player: Player) {
    const requiredFields = `${player.displayName} <@${player.discordId}>`;
    let overstatField = "";
    if (player.overstatId) {
      overstatField = " " + getPlayerOverstatUrl(player.overstatId);
    }
    return requiredFields + overstatField;
  }
}
