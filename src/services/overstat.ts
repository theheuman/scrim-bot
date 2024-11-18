import {
  OverstatTournamentResponse,
  PlayerTournamentStats,
} from "../models/overstatModels";
import { ScrimSignup } from "./signups";
import { Player } from "../models/Player";

export class OverstatService {
  private getUrl(tournamentId: string) {
    return `https://overstat.gg/api/stats/${tournamentId}/overall`;
  }

  private getTournamentId(overstatLink: string): string {
    const url = new URL(overstatLink);
    let tournamentId = undefined;
    try {
      const tournamentName = url.pathname.split("/")[3];
      tournamentId = tournamentName.split(".")[0];
    } catch {
      throw Error(
        "URL Malformated, make sure you are using the fully built url and not the shortcode",
      );
    }
    if (!tournamentId) {
      throw Error(
        "URL Malformated, make sure you are using the fully built url and not the shortcode",
      );
    }
    return tournamentId;
  }

  async getOverallStats(
    overstatLink: string,
  ): Promise<OverstatTournamentResponse> {
    const tournamentId = this.getTournamentId(overstatLink);
    const url = this.getUrl(tournamentId);
    const response = await fetch(url);
    const data = await response.text();
    return JSON.parse(data);
  }

  matchPlayers(
    signups: ScrimSignup[],
    stats: OverstatTournamentResponse,
  ): PlayerTournamentStats[] {
    // Step 1: Create a map of signed-up players by their Overstat ID (from their overstatLink)
    const playersMap = new Map<string, Player>(); // Map from Overstat ID to player details
    signups.forEach((signup) => {
      signup.players.forEach((player) => {
        if (player.overstatId) {
          playersMap.set(player.overstatId, player); // Add player to the map
        }
      });
    });

    // Step 2: Iterate over each player in the overall stats and match with signup data
    return stats.teams.flatMap((team) => {
      return team.player_stats
        .map((playerStat) => {
          const playerFromSignups = playersMap.get(
            playerStat.playerId.toString(),
          );
          if (playerFromSignups) {
            return {
              accuracy: playerStat.accuracy,
              assists: playerStat.assists,
              characters: playerStat.characters,
              damageDealt: playerStat.damageDealt,
              damageTaken: playerStat.damageTaken,
              grenadesThrown: playerStat.grenadesThrown,
              headshots: playerStat.headshots,
              hits: playerStat.hits,
              kills: playerStat.kills,
              knockdowns: playerStat.knockdowns,
              name: playerStat.name,
              playerId: playerStat.playerId,
              respawnsGiven: playerStat.respawnsGiven,
              revivesGiven: playerStat.revivesGiven,
              score: playerStat.score,
              shots: playerStat.shots,
              survivalTime: playerStat.survivalTime,
              tacticalsUsed: playerStat.tacticalsUsed,
              ultimatesUsed: playerStat.ultimatesUsed,
            };
          }
          return null; // If no match is found, return null
        })
        .filter((player) => this.notEmpty(player));
    });
  }

  notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
    return value !== null && value !== undefined;
  }
}
