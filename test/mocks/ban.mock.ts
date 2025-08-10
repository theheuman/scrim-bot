import { User } from "discord.js";
import { Scrim, ScrimSignup } from "../../src/models/Scrims";
import { Player } from "../../src/models/Player";

export class BanServiceMock {
  constructor() {}

  async addBans(
    usersToBan: User[],
    startDate: Date,
    endDate: Date,
    reason: string,
  ): Promise<string[]> {
    console.log(
      "Adding bans in ban mock",
      usersToBan,
      startDate,
      endDate,
      reason,
    );
    return [];
  }

  async expungeBans(
    banIds: string[],
  ): Promise<
    { playerDiscordId: string; playerDisplayName: string; endDate: Date }[]
  > {
    console.log("Expunging bans in ban mock", banIds);
    return [];
  }

  async teamHasBan(
    scrim: Scrim,
    players: Player[],
  ): Promise<{ hasBan: boolean; reason: string }> {
    console.log("Getting team has ban in ban mock", scrim, players);
    return { hasBan: false, reason: "" };
  }
}
