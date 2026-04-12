import { SheetsPlayer, SignupResult } from "../../src/services/league-signup";

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
}
