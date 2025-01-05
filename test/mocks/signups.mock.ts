import { ScrimSignup } from "../../src/models/Scrims";
import { User } from "discord.js";

export class ScrimSignupMock {
  constructor() {}

  async createScrim(discordChannelID: string, dateTime: Date): Promise<string> {
    console.log("Creating scrim in signup mock", discordChannelID, dateTime);
    return "";
  }

  // this is a dynamic method that checks if scores have already been computed for a given discordChannel
  // if they have been computed it creates a new scrim entry in the db and computes stats for that one
  // this solves the problem of having multiple lobbies in one scrim.
  async computeScrim(
    discordChannelID: string,
    overstatLink: string,
    skill: number,
  ) {
    console.log(
      "Computing scrim in signup mock",
      discordChannelID,
      overstatLink,
      skill,
    );
    return Promise.resolve();
  }

  async closeScrim(discordChannelID: string) {
    console.log("Closing scrim in signup mock", discordChannelID);
    return Promise.resolve();
  }

  async addTeam(
    scrimId: string,
    teamName: string,
    commandUser: User,
    players: User[],
  ): Promise<string> {
    console.log(
      "Adding team in signup mock",
      scrimId,
      teamName,
      commandUser,
      players,
    );
    return "";
  }

  async getSignups(
    discordChannelID: string,
  ): Promise<{ mainList: ScrimSignup[]; waitList: ScrimSignup[] }> {
    console.log("Getting signups in signup mock", discordChannelID);
    return { mainList: [], waitList: [] };
  }

  getScrimId(discordChannel: string): string | undefined {
    console.log("Creating scrim in signup mock", discordChannel);
    return "";
  }

  private sortTeams(teams: ScrimSignup[]): {
    mainList: ScrimSignup[];
    waitList: ScrimSignup[];
  } {
    const waitlistCutoff = 20;
    teams.sort((teamA, teamB) => {
      const lowPrioResult =
        (teamB.prio?.amount ?? 0) - (teamA.prio?.amount ?? 0);
      if (lowPrioResult === 0) {
        // lower date is better, so subtract b from a
        return teamA.date.valueOf() - teamB.date.valueOf();
      }
      return lowPrioResult;
    });
    return { mainList: teams.splice(0, waitlistCutoff), waitList: teams };
  }
}
