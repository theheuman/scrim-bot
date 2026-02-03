import { Scrim, ScrimSignup } from "../../src/models/Scrims";
import { User } from "discord.js";

export class SignupServiceMock {
  constructor() {}

  getScrim(discordChannelID: string): Scrim | undefined {
    console.log("Getting scrim in signup mock", discordChannelID);
    return undefined;
  }

  async addTeam(
    channelId: string,
    teamName: string,
    commandUser: User,
    players: User[],
  ): Promise<ScrimSignup> {
    console.log(
      "Adding team in signup mock",
      channelId,
      teamName,
      commandUser,
      players,
    );
    return {
      date: new Date(),
      players: players.map((player, index) => ({
        displayName: player.displayName,
        discordId: player.id,
        id: "db player id " + index,
      })),
      signupId: "scrim signup db id",
      signupPlayer: {
        displayName: commandUser.displayName,
        discordId: commandUser.id,
        id: "db player id",
      },
      teamName: teamName,
    };
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
