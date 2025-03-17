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
  ): Promise<string[]> {
    const playerIds = await this.getPlayerIds(prioUsers);
    return await this.db.setPrio(playerIds, startDate, endDate, amount, reason);
  }

  async expungePlayerPrio(prioIds: string[]): Promise<ExpungedPlayerPrio[]> {
    return await this.db.expungePrio(prioIds);
  }

  // changes teams in place and returns the teams, does NOT sort
  async getTeamPrioForScrim(
    scrim: Scrim,
    teams: ScrimSignup[],
    discordIdsWithScrimPass: string[],
  ): Promise<ScrimSignup[]> {
    const playersWithPrio = await this.db.getPrio(scrim.dateTime);
    const playerMap = this.generatePlayerMap(
      playersWithPrio,
      discordIdsWithScrimPass,
    );
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

  private generatePlayerMap(
    playersIdsWithPrio: PlayerPrio[],
    discordIdsWithScrimPass: string[],
  ): PlayerMap {
    const playerMap: Map<string, { amount: number; reason: string }> =
      new Map();
    // use discord id of player here
    for (const player of playersIdsWithPrio) {
      const playerPrio = playerMap.get(player.discordId);
      if (!playerPrio) {
        playerMap.set(player.discordId, {
          amount: player.amount,
          reason: player.reason,
        });
      } else {
        playerMap.set(player.discordId, {
          amount: playerPrio.amount + player.amount,
          reason: playerPrio.reason + ", " + player.reason,
        });
      }
    }

    // we only add scrim pass prio if they do not have low prio
    for (const id of discordIdsWithScrimPass) {
      const playerPrio = playerMap.get(id);
      if (!playerPrio) {
        playerMap.set(id, {
          amount: 1,
          reason: "Scrim pass",
        });
      } else if (playerPrio.amount > 0) {
        playerMap.set(id, {
          amount: playerPrio.amount + 1,
          reason: playerPrio.reason + ", " + "Scrim pass",
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
      let containsHighPrio = false;
      let containsLowPrio = false;
      const reason: string[] = [];
      team.players.forEach((player) => {
        const playerPrioEntry = playerMap.get(player.discordId);
        if (playerPrioEntry) {
          containsHighPrio = containsHighPrio
            ? containsHighPrio
            : playerPrioEntry.amount > 0;
          containsLowPrio = containsLowPrio
            ? containsLowPrio
            : playerPrioEntry.amount < 0;
          reason.push(`${player.displayName}: ${playerPrioEntry.reason}`);
          player.prio = {
            amount: playerPrioEntry.amount,
            reason: playerPrioEntry.reason,
          };
        }
      });
      // Per sly, prio does not stack. Anyone on low prio overrides whole team to be on low prio
      let amount = 0;
      if (containsLowPrio) {
        amount = -1;
      } else if (containsHighPrio) {
        amount = 1;
      }
      team.prio = {
        amount,
        reasons: reason.join("; "),
      };
    }
  }
}
