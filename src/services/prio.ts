import { DB } from "../db/db";
import { User } from "discord.js";
import { ScrimSignup } from "../models/Scrims";
import { ExpungedPlayerPrio, PlayerMap, PlayerPrio } from "../models/Prio";

export class PrioService {
  constructor(private db: DB) {}

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
    scrim: { dateTime: Date },
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
    const insertedPlayers = await this.db.insertPlayers(
      prioUsers.map((user) => ({
        discordId: user.id,
        displayName: user.displayName,
      })),
    );
    return insertedPlayers.map((player) => player.id);
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
        // if new entry is negative override all prio to be negative
      } else if (player.amount < 0) {
        playerMap.set(player.discordId, {
          amount: player.amount,
          reason: playerPrio.reason + ", " + player.reason,
        });
        // if new entry is positive let previous (potentially negative) prio override new amount
      } else if (player.amount >= 0) {
        playerMap.set(player.discordId, {
          amount: playerPrio.amount,
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
      } else if (playerPrio.amount < 0) {
        playerMap.set(id, {
          amount: -1,
          reason: playerPrio.reason + ", " + "Scrim pass",
        });
      } else if (playerPrio.amount > 0) {
        playerMap.set(id, {
          amount: 1,
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
