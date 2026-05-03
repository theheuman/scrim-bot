import { GuildMember } from "discord.js";
import { GoogleAuth, OAuth2Client } from "googleapis-common";
import { AnyAuthClient } from "google-auth-library";
import { auth, sheets } from "@googleapis/sheets";
import { SheetHelper } from "../utility/sheet-helper";
import { DB, GoogleSheetConfig } from "../db/db";
import {
  LeaguePlayer,
  PlayerRank,
  SheetsPlayer,
  VesaDivision,
  Platform,
} from "../models/league-models";

export { SheetsPlayer };

export interface SignupResult {
  rowNumber: number;
  seasonInfo: {
    signupPrioEndDate: string;
    startDate: string;
  };
}

export class LeagueService {
  constructor(private db: DB) {}

  async signup(
    teamName: string,
    teamNoDays: string,
    teamCompKnowledge: string,
    player1: SheetsPlayer,
    player2: SheetsPlayer,
    player3: SheetsPlayer,
    additionalComments: string,
  ): Promise<SignupResult | null> {
    const activeSeason = await this.db.getActiveLeagueSeason();
    if (!activeSeason) {
      throw new Error("No season found with active signups.");
    }
    const authClient = await this.getAuthClient();

    const returningPlayersCount = [player1, player2, player3].reduce(
      (count, player) => {
        if (player.previous_season_vesa_division !== VesaDivision.None) {
          return count + 1;
        } else {
          return count;
        }
      },
      0,
    );
    const values = [
      [
        new Date().toISOString(),
        teamName,
        teamNoDays,
        teamCompKnowledge,
        `${returningPlayersCount} returning players`,
        ...this.convertSheetsPlayer(player1),
        ...this.convertSheetsPlayer(player2),
        ...this.convertSheetsPlayer(player3),
        additionalComments,
      ],
    ];

    const sheetsClient = sheets({ version: "v4" });
    const request = SheetHelper.BUILD_REQUEST(
      values,
      authClient as OAuth2Client,
      this.toSheetRange(activeSeason.signupSheet),
    );

    const response = await sheetsClient.spreadsheets.values.append(request);
    const rowNumber = SheetHelper.GET_ROW_NUMBER_FROM_UPDATE_RESPONSE(
      response.data.updates,
    );

    if (!rowNumber) {
      return null;
    } else {
      return {
        rowNumber: rowNumber - SheetHelper.STARTING_CELL_OFFSET,
        seasonInfo: {
          signupPrioEndDate: activeSeason.signupPrioEndDate,
          startDate: activeSeason.startDate,
        },
      };
    }
  }

  async subRequest(
    teamDivision: string,
    teamName: string,
    weekNumber: string,
    playerOut: LeaguePlayer,
    playerIn: LeaguePlayer,
    playerInDivision: string,
    commandUser: GuildMember,
    additionalComments: string,
  ): Promise<{ rowNumber: number | null; sheetUrl: string; tabName: string }> {
    const activeSeason = await this.db.getActiveLeagueSeason();
    if (!activeSeason) {
      throw new Error("No season found with active signups.");
    }
    const authClient = await this.getAuthClient();

    const values = [
      [
        new Date().toISOString(),
        teamDivision,
        teamName,
        weekNumber,
        ...this.convertSubRequestPlayer(playerOut),
        ...this.convertSubRequestPlayer(playerIn),
        playerInDivision,
        additionalComments,
        `${commandUser.displayName} (${commandUser.id})`,
      ],
    ];

    // tab name is derived from the division rather than subSheet.tabName, which is a single static value
    const tabName = `DIV ${teamDivision.replace("Division", "")} Log`;
    const request = SheetHelper.BUILD_REQUEST(
      values,
      authClient as OAuth2Client,
      {
        id: activeSeason.subSheet.spreadsheetId,
        range: `${tabName}!${activeSeason.subSheet.rangeStart}`,
      },
    );

    const sheetsClient = sheets({ version: "v4" });
    const response = await sheetsClient.spreadsheets.values.append(request);
    const rowNumber = SheetHelper.GET_ROW_NUMBER_FROM_UPDATE_RESPONSE(
      response.data.updates,
    );
    return {
      rowNumber: rowNumber ?? null,
      sheetUrl: `<https://docs.google.com/spreadsheets/d/${activeSeason.subSheet.spreadsheetId}>`,
      tabName,
    };
  }

  async rosterChange(
    teamDivision: string,
    teamName: string,
    playerOut: LeaguePlayer,
    playerIn: LeaguePlayer,
    commandUser: GuildMember,
    additionalComments: string,
  ): Promise<{ rowNumber: number | null; sheetUrl: string; tabName: string }> {
    const activeSeason = await this.db.getActiveLeagueSeason();
    if (!activeSeason) {
      throw new Error("No season found with active signups.");
    }
    const authClient = await this.getAuthClient();

    const values = [
      [
        new Date().toISOString(),
        teamDivision,
        teamName,
        ...this.convertSubRequestPlayer(playerOut),
        ...this.convertSubRequestPlayer(playerIn),
        additionalComments,
        `${commandUser.displayName} (${commandUser.id})`,
      ],
    ];

    const request = SheetHelper.BUILD_REQUEST(
      values,
      authClient as OAuth2Client,
      this.toSheetRange(activeSeason.rosterChangeSheet),
    );

    const sheetsClient = sheets({ version: "v4" });
    const response = await sheetsClient.spreadsheets.values.append(request);
    const rowNumber = SheetHelper.GET_ROW_NUMBER_FROM_UPDATE_RESPONSE(
      response.data.updates,
    );
    return {
      rowNumber: rowNumber ?? null,
      sheetUrl: `<https://docs.google.com/spreadsheets/d/${activeSeason.rosterChangeSheet.spreadsheetId}>`,
      tabName: activeSeason.rosterChangeSheet.tabName,
    };
  }

  private toSheetRange(sheet: GoogleSheetConfig): {
    id: string;
    range: string;
  } {
    return {
      id: sheet.spreadsheetId,
      range: `${sheet.tabName}!${sheet.rangeStart}`,
    };
  }

  private convertSheetsPlayer(player: SheetsPlayer): (string | number)[] {
    return [
      player.name,
      player.discordId,
      player.overstatLink ?? "No overstat",
      VesaDivision[player.previous_season_vesa_division],
      PlayerRank[player.rank],
      Platform[player.platform],
      player.elo ?? "No elo on record",
    ];
  }

  private convertSubRequestPlayer(player: LeaguePlayer): (string | number)[] {
    return [
      `${player.name} (${player.discordId})`,
      player.overstatLink ?? "No overstat",
    ];
  }

  private getAuthClient(): Promise<AnyAuthClient> {
    const googleAuth = new auth.GoogleAuth({
      keyFile: "service-account-key.json",
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    }) as GoogleAuth;

    return googleAuth.getClient();
  }
}
