import { User } from "discord.js";
import { DB } from "../../src/db/db";
import { OverstatTournamentResponse } from "../../src/models/overstatModels";
import { ScrimSignup } from "../../src/models/Scrims";
import { Player, PlayerStatInsert } from "../../src/models/Player";

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

  getPlayerId(overstatLink: string): string {
    console.log("Mock overstat service getPlayerId", overstatLink);
    return "12345";
  }

  validateLinkUrl(overstatLink: string): string {
    console.log("Mock overstat service validateOverstatLink", overstatLink);
    return "12345";
  }

  async addPlayerOverstatLink(
    user: User,
    overstatLink: string,
  ): Promise<string> {
    console.debug("Matching players in overstat mock", user, overstatLink);
    return "";
  }

  async getPlayerOverstat(user: User): Promise<string> {
    console.debug("Get player overstat link in overstat mock", user);
    return "";
  }

  async getPlayerFromOverstatLink(
    overstatLink: string,
  ): Promise<Player | undefined> {
    console.debug(
      "Get player from overstat link in overstat mock",
      overstatLink,
    );
    return undefined;
  }
}
