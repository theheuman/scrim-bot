import { User } from "discord.js";
import { DB } from "../../src/db/db";
import { OverstatTournamentResponse } from "../../src/models/overstatModels";
import { ScrimSignup } from "../../src/models/Scrims";
import { PlayerStatInsert } from "../../src/models/Player";

export class OverstatServiceMock {
  constructor(private db: DB) {}

  async getOverallStats(
    overstatLink: string,
  ): Promise<OverstatTournamentResponse> {
    console.debug("Getting overal stats in overstat mock", overstatLink);
    return Promise.resolve({} as OverstatTournamentResponse);
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
