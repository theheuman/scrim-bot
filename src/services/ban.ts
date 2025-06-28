import { DB } from "../db/db";
import { User } from "discord.js";
import { CacheService } from "./cache";
import { Scrim, ScrimSignup } from "../models/Scrims";

export class BanService {
  constructor(
    private db: DB,
    private cache: CacheService,
  ) {}

  async addBans(
    usersToBan: User[],
    startDate: Date,
    endDate: Date,
    reason: string,
  ): Promise<string[]> {
    const playerIds = await this.getPlayerIds(usersToBan);
    return await this.db.addBans(playerIds, startDate, endDate, reason);
  }

  async expungeBans(
    banIds: string[],
  ): Promise<{ id: string; name: string; endDate: Date }[]> {
    return await this.db.expungeBans(banIds);
  }

  async teamHasBan(
    scrim: Scrim,
    team: ScrimSignup,
  ): Promise<{ hasBan: boolean; reason: string }> {
    const playersBanned: { name: string; reason: string }[] =
      await this.db.getBans(scrim.dateTime, team.players);
    if (playersBanned.length > 0) {
      return {
        hasBan: true,
        reason: playersBanned
          .map((playerBan) => `${playerBan.name}: ${playerBan.reason}`)
          .join(", "),
      };
    }
    return { hasBan: false, reason: "" };
  }

  private async getPlayerIds(prioUsers: User[]): Promise<string[]> {
    const { cacheMissedPlayers, playerIds } = this.getPlayers(prioUsers);
    if (cacheMissedPlayers.length > 0) {
      const cacheMissedPlayerIds =
        await this.fetchCacheMissedPlayerIds(cacheMissedPlayers);
      this.addPlayersToCache(cacheMissedPlayers, cacheMissedPlayerIds);
      playerIds.push(...cacheMissedPlayerIds);
    }
    return playerIds;
  }

  private getPlayers(prioUsers: User[]) {
    const prioPlayers = prioUsers.map((prioUser) =>
      this.cache.getPlayer(prioUser.id as string),
    );
    let index = 0;
    const cacheMissedPlayers: User[] = [];
    const playerIds: string[] = [];
    for (const player of prioPlayers) {
      if (player === undefined) {
        cacheMissedPlayers.push(prioUsers[index]);
      } else {
        playerIds.push(player.id);
      }
      index++;
    }
    return { cacheMissedPlayers, playerIds };
  }

  private async fetchCacheMissedPlayerIds(
    cacheMissedPlayers: User[],
  ): Promise<string[]> {
    const insertedPlayers = await this.db.insertPlayers(
      cacheMissedPlayers.map((player) => ({
        discordId: player.id,
        displayName: player.displayName,
      })),
    );
    return insertedPlayers.map((player) => player.id);
  }

  private addPlayersToCache(players: User[], playerIds: string[]) {
    playerIds.forEach((playerId, i) => {
      const discordUser = players[i];
      this.cache.setPlayer(playerId, {
        id: playerId,
        discordId: discordUser.id,
        displayName: discordUser.displayName,
      });
    });
  }
}
