import { SheetsPlayer } from "../../src/services/league-signup";

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
  ): Promise<number | null> {
    console.debug("Mock league service signup called", teamName);
    return Promise.resolve(1);
  }
}
