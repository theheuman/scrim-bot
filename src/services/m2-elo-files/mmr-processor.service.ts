import { MMRCalculatorService } from "./mmr-calculator.service.js";
import type { ProcessedGame } from "./mmr-file-reader.service.js";

export interface PlayerMMRData {
  playerId: number;
  playerName: string;
  currentMMR: number;
  gamesPlayed: number;
  mmrHistory: number[];
  gameHistory: Array<{
    matchId: string;
    gameId: number;
    date: Date;
    placement: number;
    kills: number;
    assists: number;
    damageDealt: number;
    revives: number;
    performanceScore: number;
    mmrChange: number;
    lobbyRating: number;
  }>;
  totalKills: number;
  totalAssists: number;
  totalDamage: number;
  totalRevives: number;
  wins: number;
  top3Finishes: number;
}

export interface GameResult {
  matchId: string;
  gameId: number;
  date: Date;
  playerResults: Array<{
    playerId: number;
    playerName: string;
    placement: number;
    performanceScore: number;
    mmrChange: number;
    newMMR: number;
  }>;
  lobbyRating: number;
}

export class MMRProcessorService {
  private playerMMRs: Map<number, PlayerMMRData> = new Map();

  private getOrCreatePlayer(
    playerId: number,
    playerName: string,
  ): PlayerMMRData {
    if (!this.playerMMRs.has(playerId)) {
      this.playerMMRs.set(playerId, {
        playerId,
        playerName,
        currentMMR: MMRCalculatorService.INITIAL_MMR,
        gamesPlayed: 0,
        mmrHistory: [MMRCalculatorService.INITIAL_MMR],
        gameHistory: [],
        totalKills: 0,
        totalAssists: 0,
        totalDamage: 0,
        totalRevives: 0,
        wins: 0,
        top3Finishes: 0,
      });
    }
    return this.playerMMRs.get(playerId)!;
  }

  processGame(game: ProcessedGame): GameResult {
    const playerMMRs: number[] = [];
    const playerDataMap = new Map<number, PlayerMMRData>();

    for (const player of game.players) {
      const playerData = this.getOrCreatePlayer(
        player.playerId,
        player.playerName,
      );
      playerDataMap.set(player.playerId, playerData);
      playerMMRs.push(playerData.currentMMR);
    }

    const lobbyRating = MMRCalculatorService.calculateLobbyRating(playerMMRs);

    const performanceScores: number[] = [];
    const playerPerformanceMap = new Map<number, number>();

    for (const player of game.players) {
      const perfScore = MMRCalculatorService.calculatePerformanceScore(
        player.placement,
        player.kills,
        player.assists,
        player.damageDealt,
        player.revives,
      );
      performanceScores.push(perfScore);
      playerPerformanceMap.set(player.playerId, perfScore);
    }

    const averagePerformanceScore =
      performanceScores.reduce((a, b) => a + b, 0) / performanceScores.length;

    const playerResults: GameResult["playerResults"] = [];

    for (const player of game.players) {
      const playerData = playerDataMap.get(player.playerId)!;
      const performanceScore = playerPerformanceMap.get(player.playerId)!;

      const mmrChange = MMRCalculatorService.calculateMMRChange(
        playerData.currentMMR,
        lobbyRating,
        performanceScore,
        averagePerformanceScore,
      );

      const newMMR = MMRCalculatorService.updateMMR(
        playerData.currentMMR,
        mmrChange,
      );

      playerData.currentMMR = newMMR;
      playerData.gamesPlayed++;
      playerData.mmrHistory.push(newMMR);
      if (playerData.mmrHistory.length > 100) {
        playerData.mmrHistory.shift(); // Keep last 100 games
      }

      playerData.gameHistory.push({
        matchId: game.matchId,
        gameId: game.gameId,
        date: game.date,
        placement: player.placement,
        kills: player.kills,
        assists: player.assists,
        damageDealt: player.damageDealt,
        revives: player.revives,
        performanceScore,
        mmrChange,
        lobbyRating,
      });

      playerData.totalKills += player.kills;
      playerData.totalAssists += player.assists;
      playerData.totalDamage += player.damageDealt;
      playerData.totalRevives += player.revives;

      if (player.placement === 1) {
        playerData.wins++;
      }
      if (player.placement <= 3) {
        playerData.top3Finishes++;
      }

      playerResults.push({
        playerId: player.playerId,
        playerName: player.playerName,
        placement: player.placement,
        performanceScore,
        mmrChange,
        newMMR,
      });
    }

    return {
      matchId: game.matchId,
      gameId: game.gameId,
      date: game.date,
      playerResults,
      lobbyRating,
    };
  }

  processAllGames(games: ProcessedGame[]): GameResult[] {
    const results: GameResult[] = [];

    console.log(`Processing ${games.length} games...`);

    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      if (!game) continue;
      const result = this.processGame(game);
      results.push(result);

      if ((i + 1) % 10 === 0) {
        console.log(`Processed ${i + 1}/${games.length} games`);
      }
    }

    console.log(`Finished processing all games`);

    return results;
  }

  getAllPlayerMMRs(): PlayerMMRData[] {
    return Array.from(this.playerMMRs.values()).sort(
      (a, b) => b.currentMMR - a.currentMMR,
    );
  }

  getPlayerMMR(playerId: number): PlayerMMRData | null {
    return this.playerMMRs.get(playerId) || null;
  }

  getSystemStats(): {
    totalPlayers: number;
    totalGames: number;
    averageMMR: number;
    minMMR: number;
    maxMMR: number;
    playersByGamesPlayed: { [range: string]: number };
  } {
    const players = Array.from(this.playerMMRs.values());
    const totalGames = players.reduce((sum, p) => sum + p.gamesPlayed, 0);
    const mmrs = players.map((p) => p.currentMMR);
    const averageMMR = mmrs.reduce((a, b) => a + b, 0) / mmrs.length;
    const minMMR = Math.min(...mmrs);
    const maxMMR = Math.max(...mmrs);

    const playersByGamesPlayed: { [range: string]: number } = {
      "1-10": 0,
      "11-25": 0,
      "26-50": 0,
      "51-100": 0,
      "100+": 0,
    };

    for (const player of players) {
      if (!player) continue;
      const range1_10 = playersByGamesPlayed["1-10"];
      const range11_25 = playersByGamesPlayed["11-25"];
      const range26_50 = playersByGamesPlayed["26-50"];
      const range51_100 = playersByGamesPlayed["51-100"];
      const range100Plus = playersByGamesPlayed["100+"];

      if (player.gamesPlayed <= 10 && range1_10 !== undefined)
        playersByGamesPlayed["1-10"] = range1_10 + 1;
      else if (player.gamesPlayed <= 25 && range11_25 !== undefined)
        playersByGamesPlayed["11-25"] = range11_25 + 1;
      else if (player.gamesPlayed <= 50 && range26_50 !== undefined)
        playersByGamesPlayed["26-50"] = range26_50 + 1;
      else if (player.gamesPlayed <= 100 && range51_100 !== undefined)
        playersByGamesPlayed["51-100"] = range51_100 + 1;
      else if (range100Plus !== undefined)
        playersByGamesPlayed["100+"] = range100Plus + 1;
    }

    return {
      totalPlayers: players.length,
      totalGames,
      averageMMR: Math.round(averageMMR * 100) / 100,
      minMMR,
      maxMMR,
      playersByGamesPlayed,
    };
  }
}
