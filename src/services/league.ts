import { Snowflake, GuildMember } from "discord.js";
import { GoogleAuth, OAuth2Client } from "googleapis-common";
import { AnyAuthClient } from "google-auth-library";
import { auth, sheets } from "@googleapis/sheets";
import { SheetHelper } from "../utility/sheet-helper";
import { DB } from "../db/db";
import { LeagueSubRequestPlayer } from "../models/league-models";

const SUB_REQUEST_SHEET = {
  id: "1pp8ynvVj9Z1yuuNhy8C2QvyflYhWhAQC3BQD_OJXkn4",
  range: "Sub Requests!A1",
};

const ROSTER_CHANGE_SHEET = {
  id: "1pp8ynvVj9Z1yuuNhy8C2QvyflYhWhAQC3BQD_OJXkn4",
  range: "Roster Changes!A1",
};

export enum PlayerRank {
  Bronze,
  Silver,
  Gold,
  Plat,
  LowDiamond,
  HighDiamond,
  Masters,
  Pred,
}

export enum VesaDivision {
  None,
  Division1,
  Division2,
  Division3,
  Division4,
  Division5,
  Division6,
  Division7,
  // Division8,
  // Division9,
  // Division10,
}

export enum Platform {
  pc,
  playstation,
  xbox,
  switch,
}

export interface SheetsPlayer {
  name: string;
  discordId: Snowflake;
  elo: number | undefined;
  rank: PlayerRank;
  previous_season_vesa_division: VesaDivision;
  platform: Platform;
  overstatLink: string | undefined;
}

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
    const activeSeason = await this.db.getActiveLeagueSeason();
    if (!activeSeason) {
      throw new Error("No season found with active signups.");
    }
    const request = SheetHelper.BUILD_REQUEST(
      values,
      authClient as OAuth2Client,
      {
        id: activeSeason.googleSheetId,
        range: `${activeSeason.googleSheetName}!${activeSeason.googleSheetRangeStart}`,
      },
    );

    const response = await sheetsClient.spreadsheets.values.append(request);
    console.log(response.data);
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
    playerOut: LeagueSubRequestPlayer,
    playerIn: LeagueSubRequestPlayer,
    commandUser: GuildMember,
    additionalComments: string,
  ): Promise<number | null> {
    const authClient = await this.getAuthClient();

    const values = [
      [
        new Date().toISOString(),
        teamDivision,
        teamName,
        weekNumber,
        ...this.convertSubRequestPlayer(playerOut),
        ...this.convertSubRequestPlayer(playerIn),
        commandUser.displayName,
        commandUser.id,
        additionalComments,
      ],
    ];

    const request = SheetHelper.BUILD_REQUEST(
      values,
      authClient as OAuth2Client,
      SUB_REQUEST_SHEET,
    );

    const sheetsClient = sheets({ version: "v4" });
    const response = await sheetsClient.spreadsheets.values.append(request);
    const rowNumber = SheetHelper.GET_ROW_NUMBER_FROM_UPDATE_RESPONSE(
      response.data.updates,
    );
    return rowNumber ? rowNumber - SheetHelper.STARTING_CELL_OFFSET : null;
  }

  async rosterChange(
    teamDivision: string,
    teamName: string,
    playerOut: LeagueSubRequestPlayer,
    playerIn: LeagueSubRequestPlayer,
    commandUser: GuildMember,
    additionalComments: string,
  ): Promise<number | null> {
    const authClient = await this.getAuthClient();

    const values = [
      [
        new Date().toISOString(),
        teamDivision,
        teamName,
        ...this.convertSubRequestPlayer(playerOut),
        ...this.convertSubRequestPlayer(playerIn),
        commandUser.displayName,
        commandUser.id,
        additionalComments,
      ],
    ];

    const request = SheetHelper.BUILD_REQUEST(
      values,
      authClient as OAuth2Client,
      ROSTER_CHANGE_SHEET,
    );

    const sheetsClient = sheets({ version: "v4" });
    const response = await sheetsClient.spreadsheets.values.append(request);
    const rowNumber = SheetHelper.GET_ROW_NUMBER_FROM_UPDATE_RESPONSE(
      response.data.updates,
    );
    return rowNumber ? rowNumber - SheetHelper.STARTING_CELL_OFFSET : null;
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

  private convertSubRequestPlayer(
    player: LeagueSubRequestPlayer,
  ): (string | number)[] {
    return [
      player.name,
      player.discordId,
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
