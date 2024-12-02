import { DB } from "../db/db";
import { User } from "discord.js";
import { AuthService } from "./auth";
import { CacheService } from "./cache";
import { Scrim, ScrimSignup } from "../models/Scrims";

export class PrioService {
  constructor(
    private db: DB,
    private cache: CacheService,
    private authService: AuthService,
  ) {}

  // TODO multiple users in one prio call, will need to edit db.insertPlayerIfNotExists or add additional method
  async setPlayerPrio(
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

  async setTeamPrioForScrim(scrim: Scrim, teams: ScrimSignup[]) {
    const playersIdsWithPrio = await this.db.getPrio(scrim.dateTime);
    const playerMap: Map<string, { amount: number; reason: string }> =
      new Map();
    for (const player of playersIdsWithPrio) {
      const mapEntry = playerMap.get(player.id);
      if (!mapEntry) {
        playerMap.set(player.id, {
          amount: player.amount,
          reason: player.reason,
        });
      } else {
        playerMap.set(player.id, {
          amount: mapEntry.amount + player.amount,
          reason: mapEntry.reason + ", " + player.reason,
        });
      }
    }
    for (const team of teams) {
      let prio = 0;
      const reason: string[] = [];
      team.players.forEach((player) => {
        const playerPrioEntry = playerMap.get(player.id);
        if (playerPrioEntry) {
          prio += playerPrioEntry.amount;
          reason.push(`${player.displayName} has ${playerPrioEntry.reason}`);
          player.prio = {
            amount: playerPrioEntry.amount,
            reason: playerPrioEntry.reason,
          };
        }
      });
      team.prio = {
        amount: prio,
        reasons: reason.join("; "),
      };
    }
  }
}
