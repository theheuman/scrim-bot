import { User } from "discord.js";
import { DB } from "../../src/db/db";
import { OverstatTournamentResponse } from "../../src/models/overstatModels";
import { ScrimSignup } from "../../src/models/Scrims";
import { PlayerStatInsert } from "../../src/models/Player";

export class OverstatServiceMock {
  constructor() {}

  async getOverallStatsForId(
    overstatId: string,
  ): Promise<OverstatTournamentResponse> {
    console.debug("Getting overall stats for id in overstat mock", overstatId);
    return Promise.resolve({} as OverstatTournamentResponse);
  }

  async getOverallStatsForLink(
    overstatLink: string,
  ): Promise<{ id: string; stats: OverstatTournamentResponse }> {
    console.debug(
      "Getting overall stats for link in overstat mock",
      overstatLink,
    );
    return Promise.resolve({
      id: "12345",
      stats: {} as OverstatTournamentResponse,
    });
  }

  getTournamentId(overstatLink: string): string {
    console.log("Mock overstat service getTournamentId", overstatLink);
    return "12345";
  }

  matchPlayers(
    scrimId: string,
    signups: ScrimSignup[],
    stats: OverstatTournamentResponse,
  ): PlayerStatInsert[] {
    console.debug("Matching players in overstat mock", scrimId, signups, stats);
    return [];
  }

  async addPlayerOverstatLink(
    user: User,
    overstatLink: string,
  ): Promise<string> {
    console.debug("Matching players in overstat mock", user, overstatLink);
    return "";
  }

  async getPlayerOverstat(user: User): Promise<string> {
    console.debug("Matching players in overstat mock", user);
    return "";
  }
}
