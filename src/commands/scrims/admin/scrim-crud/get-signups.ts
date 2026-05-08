import { ScrimSignup } from "../../../../models/Scrims";
import { AdminCommand } from "../../../command";
import { CustomInteraction } from "../../../interaction";
import { SignupService } from "../../../../services/signups";
import { AuthService } from "../../../../services/auth";
import * as fs from "node:fs";
import { StaticValueService } from "../../../../services/static-values";
import { Player } from "../../../../models/Player";
import { getPlayerOverstatUrl } from "../../../../services/overstat";
import { GetSignupsHelper } from "../../../utility/get-signups";
import { MmrService } from "../../../../services/mmr";
import { appConfig } from "../../../../config";

const MMR_SORT_THRESHOLD = appConfig.lobbySize * 2;

export class GetSignupsCommand extends AdminCommand {
  constructor(
    authService: AuthService,
    private signupService: SignupService,
    private staticValueService: StaticValueService,
    private mmrService: MmrService,
  ) {
    super(authService, "get-signups", "Gets signups for this scrim");
    this.addBooleanInput("refresh-mmr", "Force a fresh fetch of MMR data");
  }

  async run(interaction: CustomInteraction) {
    // Before executing any other code, we need to acknowledge the interaction.
    // Discord only gives us 3 seconds to acknowledge an interaction before
    // the interaction gets voided and can't be used anymore.
    await interaction.editReply("Fetching teams, command in progress");

    const channelId = interaction.channelId;
    const forceRefresh = interaction.options.getBoolean("refresh-mmr") ?? false;

    const channelSignups = await GetSignupsHelper.getSignupsForChannel(
      this.signupService,
      this.staticValueService,
      interaction,
    );
    if (!channelSignups) {
      return;
    }

    const { mainList, waitList } = channelSignups;

    const mainListString = `Main list.\n${this.formatTeams(mainList)}`;
    await this.replyWithString(interaction, mainListString);

    if (waitList.length > 0) {
      const waitListString = `Wait list.\n${this.formatTeams(waitList)}`;
      await this.replyWithString(interaction, waitListString);
    }

    const files: { attachment: string; name: string }[] = [];
    const tempFiles: string[] = [];

    let mmrMap = new Map<string, number>();
    try {
      mmrMap = await this.mmrService.getMmrMap(forceRefresh);
    } catch (e) {
      await interaction.followUp({
        content: "Could not fetch MMR data, MMR columns will show n/a. " + e,
        ephemeral: true,
      });
    }

    try {
      const priorityCsvName = this.generatePriorityCsv(
        channelId,
        mainList,
        waitList,
        mmrMap,
      );
      files.push({ attachment: priorityCsvName, name: "signups.csv" });
      tempFiles.push(priorityCsvName);
    } catch (e) {
      await interaction.editReply("Problem generating signups csv. " + e);
    }

    if (mainList.length >= MMR_SORT_THRESHOLD) {
      try {
        const mmrCsvName = this.generateMmrCsv(channelId, mainList, mmrMap);
        files.push({ attachment: mmrCsvName, name: "signups-mmr.csv" });
        tempFiles.push(mmrCsvName);
      } catch (e) {
        await interaction.followUp({
          content: "Problem generating MMR csv. " + e,
          ephemeral: true,
        });
      }
    }

    if (files.length > 0) {
      await interaction.followUp({ files, ephemeral: true });
      for (const f of tempFiles) {
        fs.unlink(f, () => null);
      }
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
  private generatePriorityCsv(
    channelId: string,
    mainList: ScrimSignup[],
    waitList: ScrimSignup[],
    mmrMap: Map<string, number>,
  ): string {
    const teamCsvStringConverter = (team: ScrimSignup) => {
      const teamNameColumn = team.players[0]
        ? `${team.teamName} ${this.formatPlayer(team.players[0])}`
        : team.teamName;
      const playerColumns = team.players.map((p) =>
        this.getPlayerCsvFields(p, mmrMap),
      );
      const prioColumn = `"${team.prio?.amount ?? 0}: ${team.prio?.reasons ?? ""}"`;
      return [teamNameColumn, ...playerColumns, prioColumn].join(",");
    };
    const mainListString = mainList.map(teamCsvStringConverter).join("\n");
    const sampleTeam = mainList[0] ?? waitList[0];
    const separatorCommas = sampleTeam
      ? ",".repeat(teamCsvStringConverter(sampleTeam).split(",").length - 1)
      : ",,,";
    const separator = `\n${separatorCommas}\n`;
    const waitListString = waitList.map(teamCsvStringConverter).join("\n");
    const content = mainListString + separator + waitListString;
    const fileName = "temp-signup-" + channelId + ".csv";
    fs.writeFileSync(fileName, content);
    return fileName;
  }

  // string returned is the file location
  private generateMmrCsv(
    channelId: string,
    mainList: ScrimSignup[],
    mmrMap: Map<string, number>,
  ): string {
    const header =
      "missing_mmr_flag,team_name,team_mmr,team_discord_pings," +
      "player1_name,player1_overstat_url,player1_mmr," +
      "player2_name,player2_overstat_url,player2_mmr," +
      "player3_name,player3_overstat_url,player3_mmr," +
      "prio";

    const teamsWithMmr = mainList.map((team) =>
      this.resolveTeamMmr(team, mmrMap),
    );
    teamsWithMmr.sort((a, b) => {
      const prioResult =
        (b.team.prio?.amount ?? 0) - (a.team.prio?.amount ?? 0);
      if (prioResult !== 0) {
        return prioResult;
      }
      // missing MMR teams float to top within their priority tier
      if (a.missingMmr !== b.missingMmr) {
        return a.missingMmr ? -1 : 1;
      }
      return b.teamMmr - a.teamMmr;
    });

    const columnCount = header.split(",").length;
    const lobbySeparator = (lobbyNum: number) =>
      `--- Lobby ${lobbyNum} ---` + ",".repeat(columnCount - 1);

    const rows: string[] = [];
    teamsWithMmr.forEach(({ team, missingMmr, teamMmr, playerMmrs }, index) => {
      if (index % appConfig.lobbySize === 0) {
        rows.push(lobbySeparator(index / appConfig.lobbySize + 1));
      }
      const flag = missingMmr ? "UNKNOWN" : "";
      const mmrDisplay = missingMmr ? "UNKNOWN" : teamMmr.toFixed(3);
      const pings = team.players[0]
        ? `${team.teamName} <@${team.players[0].discordId}>`
        : team.teamName;
      const playerCols = team.players.map((p, i) => {
        const overstatUrl = p.overstatId
          ? getPlayerOverstatUrl(p.overstatId)
          : "";
        const mmr =
          playerMmrs[i] !== undefined ? playerMmrs[i]!.toFixed(3) : "n/a";
        return `${p.displayName},${overstatUrl},${mmr}`;
      });
      const prioCol = `"${team.prio?.amount ?? 0}: ${team.prio?.reasons ?? ""}"`;
      rows.push(
        [flag, team.teamName, mmrDisplay, pings, ...playerCols, prioCol].join(
          ",",
        ),
      );
    });

    const content = [header, ...rows].join("\n");
    const fileName = "temp-signup-mmr-" + channelId + ".csv";
    fs.writeFileSync(fileName, content);
    return fileName;
  }

  private resolveTeamMmr(
    team: ScrimSignup,
    mmrMap: Map<string, number>,
  ): {
    team: ScrimSignup;
    missingMmr: boolean;
    teamMmr: number;
    playerMmrs: (number | undefined)[];
  } {
    const playerMmrs = team.players.map((p) =>
      p.overstatId ? mmrMap.get(p.overstatId) : undefined,
    );
    const missingMmr =
      team.players.length === 0 || playerMmrs.some((mmr) => mmr === undefined);
    const known = playerMmrs.filter((mmr): mmr is number => mmr !== undefined);
    const teamMmr =
      known.length > 0 ? known.reduce((a, b) => a + b, 0) / known.length : 0;
    return { team, missingMmr, teamMmr, playerMmrs };
  }

  private getPlayerCsvFields(player: Player, mmrMap: Map<string, number>) {
    const requiredFields = `${player.displayName} <@${player.discordId}>`;
    let overstatField = "";
    if (player.overstatId) {
      overstatField = " " + getPlayerOverstatUrl(player.overstatId);
    }
    const mmr = player.overstatId
      ? (mmrMap.get(player.overstatId)?.toFixed(3) ?? "")
      : "";
    return `${requiredFields}${overstatField} ${mmr}`;
  }
}
