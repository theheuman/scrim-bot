import { SheetsPlayer, SignupResult } from "../../src/services/league";
import { LeaguePlayer } from "../../src/models/league-models";
import { GuildMember } from "discord.js";

export class LeagueServiceMock {
  constructor() {}

  async signup(
    teamName: string,
    teamNoDays: string,
    teamCompKnowledge: string,
    player1: SheetsPlayer,
    player2: SheetsPlayer,
    player3: SheetsPlayer,
    additionalComments: string,
  ): Promise<SignupResult | null> {
    console.debug("Mock league service signup called", teamName);
    return Promise.resolve({
      rowNumber: 1,
      seasonInfo: {
        signupPrioEndDate: new Date("2025-12-25T00:00:00Z").toISOString(),
        startDate: new Date("2026-01-01T00:00:00Z").toISOString(),
      },
    });
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
    console.debug("Mock league service subRequest called", teamName);
    return Promise.resolve({
      rowNumber: 0,
      sheetUrl: "https://docs.google.com/spreadsheets/d/mock_sub_sheet_id",
      tabName: "mock_sub_tab_name",
    });
  }

  async getRosterDiscordIds(): Promise<Map<string, string>> {
    console.debug("Mock league service getRosterDiscordIds called");
    return Promise.resolve(new Map());
  }

  async rosterChange(
    teamDivision: string,
    teamName: string,
    playerOut: LeaguePlayer,
    playerIn: LeaguePlayer,
    commandUser: GuildMember,
    additionalComments: string,
  ): Promise<{ rowNumber: number | null; sheetUrl: string; tabName: string }> {
    console.debug("Mock league service rosterChange called", teamName);
    return Promise.resolve({
      rowNumber: 0,
      sheetUrl: "https://docs.google.com/spreadsheets/d/mock_roster_sheet_id",
      tabName: "mock_roster_tab_name",
    });
  }
}
