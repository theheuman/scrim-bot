import { User } from "discord.js";
import { ExpungedPlayerPrio } from "../../src/models/Prio";
import { Scrim, ScrimSignup } from "../../src/models/Scrims";

export class PrioServiceMock {
  constructor() {}

  async setPlayerPrio(
    prioUsers: User[],
    startDate: Date,
    endDate: Date,
    amount: number,
    reason: string,
  ): Promise<string[]> {
    console.log(
      "Setting player prio in prio mock",
      prioUsers,
      startDate,
      endDate,
      amount,
      reason,
    );
    return [];
  }

  async expungePlayerPrio(prioIds: string[]): Promise<ExpungedPlayerPrio[]> {
    console.log("Expunging player prio in prio mock", prioIds);
    return [];
  }

  // changes teams in place and returns the teams, does NOT sort
  async getTeamPrioForScrim(
    scrim: Scrim,
    teams: ScrimSignup[],
    usersWithScrimPass: User[],
  ): Promise<ScrimSignup[]> {
    console.log(
      "Getting team prio in prio mock",
      scrim,
      teams,
      usersWithScrimPass,
    );
    return [];
  }
}
