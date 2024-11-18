import { OverstatTournamentResponse } from "../models/overstatModels";
import { ScrimSignup } from "./signups";
import { Player, PlayerStatInsert } from "../models/Player";

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
    scrimId: string,
    signups: ScrimSignup[],
    stats: OverstatTournamentResponse,
  ): PlayerStatInsert[] {
    // Step 1: Create a map of signed-up players by their Overstat ID (from their overstatLink)
    const playersMap = new Map<string, Player>(); // Map from Overstat ID to player details
    signups.forEach((signup) => {
      signup.players.forEach((player) => {
        if (player.overstatId) {
          playersMap.set(player.overstatId, player); // Add player to the map
        }
      });
    });
    const players: Map<string, PlayerStatInsert> = new Map();
    for (const game of stats.games) {
      for (const team of game.teams) {
        for (const playerStat of team.player_stats) {
          const playerFromSignups = playersMap.get(
            playerStat.playerId.toString(),
          );
          if (playerFromSignups) {
            const player = players.get(playerStat.playerId.toString());
            if (player) {
              player.assists += playerStat.assists;
              player.characters += "," + playerStat.characterName;
              player.damage_dealt += playerStat.damageDealt;
              player.damage_taken += playerStat.damageTaken ?? 0;
              player.grenades_thrown += playerStat.grenadesThrown ?? 0;
              player.kills += playerStat.kills;
              player.knockdowns += playerStat.knockdowns;
              player.respawns_given += playerStat.respawnsGiven;
              player.revives_given += playerStat.revivesGiven;
              player.score += playerStat.score;
              player.survival_time += playerStat.survivalTime;
              player.tacticals_used += playerStat.tacticalsUsed ?? 0;
              player.ultimates_used += playerStat.ultimatesUsed ?? 0;
              player.games_played++;
            } else {
              players.set(playerStat.playerId.toString(), {
                player_id: playerFromSignups.id,
                scrim_id: scrimId,
                assists: playerStat.assists,
                characters: playerStat.characterName,
                damage_dealt: playerStat.damageDealt,
                damage_taken: playerStat.damageTaken ?? 0,
                grenades_thrown: playerStat.grenadesThrown ?? 0,
                kills: playerStat.kills,
                knockdowns: playerStat.knockdowns,
                name: playerStat.name,
                respawns_given: playerStat.respawnsGiven,
                revives_given: playerStat.revivesGiven,
                score: playerStat.score,
                survival_time: playerStat.survivalTime,
                tacticals_used: playerStat.tacticalsUsed ?? 0,
                ultimates_used: playerStat.ultimatesUsed ?? 0,
                games_played: 1,
              });
            }
          }
        }
      }
    }
    return Array.from(players.values());
  }
}