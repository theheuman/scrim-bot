import { DB } from "../db/db";
import { User } from "discord.js";
import { CacheService } from "./cache";
import { Scrim, ScrimSignup } from "../models/Scrims";
import { ExpungedPlayerPrio, PlayerMap, PlayerPrio } from "../models/Prio";

export class PrioService {
  constructor(
    private db: DB,
    private cache: CacheService,
  ) {}

  async setPlayerPrio(
    prioUsers: User[],
    startDate: Date,
    endDate: Date,
    amount: number,
    reason: string,
  ) {
    const playerIds = await this.getPlayerIds(prioUsers);
    return await this.db.setPrio(playerIds, startDate, endDate, amount, reason);
  }

  async expungePlayerPrio(prioIds: string[]): Promise<ExpungedPlayerPrio[]> {
    return await this.db.expungePrio(prioIds);
  }

  // changes teams in place and returns the teams, does NOT sort
  async getTeamPrioForScrim(scrim: Scrim, teams: ScrimSignup[]) {
    const playersIdsWithPrio = await this.db.getPrio(scrim.dateTime);
    const playerMap = this.generatePlayerMap(playersIdsWithPrio);
    this.setTeamPrioFromPlayerPrio(teams, playerMap);
    return teams;
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

  private fetchCacheMissedPlayerIds(
    cacheMissedPlayers: User[],
  ): Promise<string[]> {
    return this.db.insertPlayers(
      cacheMissedPlayers.map((player) => ({
        discordId: player.id,
        displayName: player.displayName,
      })),
    );
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

  private generatePlayerMap(playersIdsWithPrio: PlayerPrio[]): PlayerMap {
    const playerMap: Map<string, { amount: number; reason: string }> =
      new Map();
    for (const player of playersIdsWithPrio) {
      const playerPrio = playerMap.get(player.id);
      if (!playerPrio) {
        playerMap.set(player.id, {
          amount: player.amount,
          reason: player.reason,
        });
      } else {
        playerMap.set(player.id, {
          amount: playerPrio.amount + player.amount,
          reason: playerPrio.reason + ", " + player.reason,
        });
      }
    }
    return playerMap;
  }

  private setTeamPrioFromPlayerPrio(
    teams: ScrimSignup[],
    playerMap: PlayerMap,
  ) {
    for (const team of teams) {
      let prio = 0;
      const reason: string[] = [];
      team.players.forEach((player) => {
        const playerPrioEntry = playerMap.get(player.id);
        if (playerPrioEntry) {
          prio += playerPrioEntry.amount;
          reason.push(`${player.displayName}: ${playerPrioEntry.reason}`);
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
