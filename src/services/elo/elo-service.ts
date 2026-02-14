import { MMRCalculator } from "./mmr-calculator";
import {
  GameResponse,
  OverstatTournamentResponse,
} from "../../models/overstatModels";
import { DB } from "../../db/db";
import { HuggingFaceService } from "../hugging-face";

export class EloService {
  constructor(
    private db: DB,
    private huggingFaceService: HuggingFaceService,
  ) {}

  /**
   * Processes a single game and returns a map of valid players and their new MMR.
   * Players not found in the input map will be treated as having INITIAL_MMR.
   *
   * @param game The processed game data
   * @param currentPlayerElos Map of player identifiers (Overstat ID or Discord ID, consistent within usage) to current Elo
   * @returns Map of player identifiers to NEW Elo
   */
  public processGame(
    game: GameResponse,
    currentPlayerElos: Map<string | number, number>,
  ): Map<string | number, number> {
    const playerMMRs: number[] = [];
    // Flatten all players from all teams
    const allPlayers = game.teams.flatMap((team) => team.player_stats);

    // Pre-pass: Gather MMRS for lobby calculation
    for (const player of allPlayers) {
      const currentElo =
        currentPlayerElos.get(player.playerId) ?? MMRCalculator.INITIAL_MMR;
      playerMMRs.push(currentElo);
    }

    const lobbyRating = MMRCalculator.calculateLobbyRating(playerMMRs);

    // Calculate Performance Scores
    const performanceScores: number[] = [];
    const playerPerformanceMap = new Map<number, number>();

    for (const player of allPlayers) {
      const perfScore = MMRCalculator.calculatePerformanceScore(
        player.teamPlacement,
        player.kills,
        player.assists,
        player.damageDealt,
        player.revivesGiven,
      );
      performanceScores.push(perfScore);
      playerPerformanceMap.set(player.playerId, perfScore);
    }

    const averagePerformanceScore =
      performanceScores.length > 0
        ? performanceScores.reduce((a, b) => a + b, 0) /
          performanceScores.length
        : 0;

    // Calculate New MMRs
    const newElos = new Map<string | number, number>();

    for (const player of allPlayers) {
      const currentElo =
        currentPlayerElos.get(player.playerId) ?? MMRCalculator.INITIAL_MMR;
      const performanceScore = playerPerformanceMap.get(player.playerId)!;

      const mmrChange = MMRCalculator.calculateMMRChange(
        currentElo,
        lobbyRating,
        performanceScore,
        averagePerformanceScore,
      );

      const newMMR = MMRCalculator.updateMMR(currentElo, mmrChange);
      newElos.set(player.playerId, newMMR);
    }

    return newElos;
  }

  public async processTournament(
    stats: OverstatTournamentResponse,
  ): Promise<void> {
    // 1. Identify all players involved
    const playerOverstatIds = new Set<string>();
    for (const game of stats.games) {
      for (const team of game.teams) {
        for (const player of team.player_stats) {
          playerOverstatIds.add(player.playerId.toString());
        }
      }
    }
    // TODO alert with discord service players that played that aren't linked?

    if (playerOverstatIds.size === 0) return;

    // 2. Fetch current Elos from DB
    const players = await this.db.getPlayersByOverstatIds(
      Array.from(playerOverstatIds),
    );
    const currentElos = new Map<string | number, number>();
    for (const p of players) {
      if (p.overstatId && p.elo !== undefined) {
        currentElos.set(Number(p.overstatId), p.elo);
      }
    }

    // 3. Process games chronologically
    for (const game of stats.games) {
      const newElos = this.processGame(game, currentElos);
      // Update local state for next game iteration
      for (const [playerId, elo] of newElos) {
        currentElos.set(playerId, elo);
      }
    }

    // 4. Save final Elos to DB
    for (const player of players) {
      if (!player.overstatId) continue;
      const finalElo = currentElos.get(Number(player.overstatId));
      if (finalElo !== undefined && finalElo !== player.elo) {
        await this.db.updatePlayerElo(player.overstatId, finalElo);
      }
    }
  }

  public async recalculateAllElo(
    progressCallback: (msg: string) => Promise<void>,
  ): Promise<void> {
    // 1. Fetch all file names
    const files = await this.huggingFaceService.listFiles();
    // Sort files chronologically: scrim_YYYY_MM_DD_id_ID.json
    files.sort();

    if (files.length === 0) {
      await progressCallback("No scrim files found in Hugging Face repo.");
      return;
    }

    await progressCallback(
      `Found ${files.length} scrim files. Reducing DB load by fetching players in batches...`,
    );

    // 2. Reset Elos in memory
    const eloState = new Map<string, number>(); // OverstatId -> Elo

    // 3. Iterate through files
    let processedCount = 0;
    for (const file of files) {
      try {
        // Download and process
        const stats = await this.huggingFaceService.downloadFile(file);

        for (const game of stats.games) {
          const inputElos = new Map<string | number, number>();

          // Populate inputElos from eloState
          const allPlayers = game.teams.flatMap((t) => t.player_stats);
          for (const p of allPlayers) {
            inputElos.set(
              p.playerId,
              eloState.get(String(p.playerId)) ?? MMRCalculator.INITIAL_MMR,
            );
          }

          const newElos = this.processGame(game, inputElos);

          // Update global state
          for (const [playerId, elo] of newElos) {
            eloState.set(String(playerId), elo);
          }
        }

        processedCount++;
        if (processedCount % 5 === 0) {
          await progressCallback(
            `Processed ${processedCount}/${files.length} files...`,
          );
        }
      } catch (e) {
        console.error(`Error processing file ${file}:`, e);
        // Continue to next file
      }
    }

    await progressCallback(
      `All files processed. Updating database for ${eloState.size} entries (only matching players will be updated)...`,
    );

    // 4. Bulk Update
    const allOverstatIds = Array.from(eloState.keys());
    const BATCH_SIZE = 100;
    let updatedCount = 0;

    for (let i = 0; i < allOverstatIds.length; i += BATCH_SIZE) {
      const batchIds = allOverstatIds.slice(i, i + BATCH_SIZE);
      // Fetch players from DB that match these IDs
      const dbPlayers = await this.db.getPlayersByOverstatIds(batchIds);

      for (const player of dbPlayers) {
        if (player.overstatId) {
          const newElo = eloState.get(player.overstatId);
          if (newElo !== undefined) {
            await this.db.updatePlayerElo(player.overstatId, newElo);
            updatedCount++;
          }
        }
      }

      if ((i + BATCH_SIZE) % 500 === 0) {
        await progressCallback(`Database updated: ${updatedCount} players...`);
      }
    }

    await progressCallback(
      `Elo recalculation complete! Processed ${files.length} files. Updated ${updatedCount} players.`,
    );
  }
}
