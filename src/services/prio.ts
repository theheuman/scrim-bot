import { DB } from "../db/db";
import { User } from "discord.js";
import { AuthService } from "./auth";
import { CacheService } from "./cache";

export class PrioService {
  constructor(
    private db: DB,
    private cache: CacheService,
    private authService: AuthService,
  ) {}

  // TODO multiple users in one prio call, will need to edit db.insertPlayerIfNotExists or add additional method
  async setPrio(
    commandUser: User,
    prioUsers: User[],
    startDate: Date,
    endDate: Date,
    amount: number,
    reason: string,
  ) {
    const isAuthorized = await this.authService.userIsAdmin(commandUser);
    if (!isAuthorized) {
      throw Error("User not authorized");
    }
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
    if (cacheMissedPlayers.length > 0) {
      const cacheMissedPlayerIds = await this.db.insertPlayers(
        cacheMissedPlayers.map((player) => ({
          discordId: player.id,
          displayName: player.displayName,
        })),
      );
      cacheMissedPlayerIds.forEach((playerId, i) => {
        const discordUser = cacheMissedPlayers[i];
        this.cache.setPlayer(playerId, {
          id: playerId,
          discordId: discordUser.id,
          displayName: discordUser.displayName,
        });
      });
      playerIds.push(...cacheMissedPlayerIds);
    }
    return await this.db.setPrio(playerIds, startDate, endDate, amount, reason);
  }
}
