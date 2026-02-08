import * as fs from "fs";
import type { PlayerMMRData, GameResult } from "./mmr-processor.service.js";

export class MMROutputService {
  // Generates a CSV file with player rankings and stats

  static generatePlayerRankingsCSV(
    players: PlayerMMRData[],
    outputPath: string,
  ): void {
    const headers = [
      "Rank",
      "Player ID",
      "Player Name",
      "Current MMR",
      "Games Played",
      "Wins",
      "Win Rate %",
      "Top 3 Finishes",
      "Top 3 Rate %",
      "Total Kills",
      "Avg Kills/Game",
      "Total Assists",
      "Avg Assists/Game",
      "Total Damage",
      "Avg Damage/Game",
      "Total Revives",
      "Avg Revives/Game",
      "MMR Change (Last 10 Games)",
      "Peak MMR",
    ];

    const rows: string[][] = [headers];

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      if (!player) continue;
      const rank = i + 1;
      const winRate =
        player.gamesPlayed > 0
          ? ((player.wins / player.gamesPlayed) * 100).toFixed(2)
          : "0.00";
      const top3Rate =
        player.gamesPlayed > 0
          ? ((player.top3Finishes / player.gamesPlayed) * 100).toFixed(2)
          : "0.00";
      const avgKills =
        player.gamesPlayed > 0
          ? (player.totalKills / player.gamesPlayed).toFixed(2)
          : "0.00";
      const avgAssists =
        player.gamesPlayed > 0
          ? (player.totalAssists / player.gamesPlayed).toFixed(2)
          : "0.00";
      const avgDamage =
        player.gamesPlayed > 0
          ? (player.totalDamage / player.gamesPlayed).toFixed(2)
          : "0.00";
      const avgRevives =
        player.gamesPlayed > 0
          ? (player.totalRevives / player.gamesPlayed).toFixed(2)
          : "0.00";

      const last10Games = player.mmrHistory.slice(-10);
      const mmrChangeLast10 =
        last10Games.length >= 2 &&
        last10Games[0] !== undefined &&
        last10Games[last10Games.length - 1] !== undefined
          ? (last10Games[last10Games.length - 1]! - last10Games[0]!).toFixed(2)
          : "0.00";

      const peakMMR = Math.max(...player.mmrHistory);

      rows.push([
        rank.toString(),
        player.playerId.toString(),
        player.playerName,
        player.currentMMR.toFixed(2),
        player.gamesPlayed.toString(),
        player.wins.toString(),
        winRate,
        player.top3Finishes.toString(),
        top3Rate,
        player.totalKills.toString(),
        avgKills,
        player.totalAssists.toString(),
        avgAssists,
        player.totalDamage.toFixed(2),
        avgDamage,
        player.totalRevives.toString(),
        avgRevives,
        mmrChangeLast10,
        peakMMR.toFixed(2),
      ]);
    }

    const csvContent = rows
      .map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const BOM = "\uFEFF";
    fs.writeFileSync(outputPath, BOM + csvContent, "utf-8");
    console.log(
      `Generated player rankings CSV: ${outputPath} (${rows.length - 1} players)`,
    );
  }

  static generatePlayerRankingsJSON(
    players: PlayerMMRData[],
    outputPath: string,
  ): void {
    const data = players.map((player, index) => ({
      rank: index + 1,
      playerId: player.playerId,
      playerName: player.playerName,
      currentMMR: Math.round(player.currentMMR * 100) / 100,
      gamesPlayed: player.gamesPlayed,
      wins: player.wins,
      winRate:
        player.gamesPlayed > 0
          ? Math.round((player.wins / player.gamesPlayed) * 10000) / 100
          : 0,
      top3Finishes: player.top3Finishes,
      top3Rate:
        player.gamesPlayed > 0
          ? Math.round((player.top3Finishes / player.gamesPlayed) * 10000) / 100
          : 0,
      totalKills: player.totalKills,
      avgKills:
        player.gamesPlayed > 0
          ? Math.round((player.totalKills / player.gamesPlayed) * 100) / 100
          : 0,
      totalAssists: player.totalAssists,
      avgAssists:
        player.gamesPlayed > 0
          ? Math.round((player.totalAssists / player.gamesPlayed) * 100) / 100
          : 0,
      totalDamage: Math.round(player.totalDamage * 100) / 100,
      avgDamage:
        player.gamesPlayed > 0
          ? Math.round((player.totalDamage / player.gamesPlayed) * 100) / 100
          : 0,
      totalRevives: player.totalRevives,
      avgRevives:
        player.gamesPlayed > 0
          ? Math.round((player.totalRevives / player.gamesPlayed) * 100) / 100
          : 0,
      peakMMR: Math.round(Math.max(...player.mmrHistory) * 100) / 100,
      mmrHistory: player.mmrHistory
        .slice(-50)
        .map((mmr) => Math.round(mmr * 100) / 100),
    }));

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`Generated player rankings JSON: ${outputPath}`);
  }

  static generateSummaryReport(systemStats: any, outputPath: string): void {
    const report = `
MMR System Summary Report
=========================

Total Players: ${systemStats.totalPlayers}
Total Games Processed: ${systemStats.totalGames}

MMR Statistics:
  Average MMR: ${systemStats.averageMMR}
  Minimum MMR: ${systemStats.minMMR}
  Maximum MMR: ${systemStats.maxMMR}
  MMR Range: ${systemStats.maxMMR - systemStats.minMMR}

Players by Games Played:
  1-10 games: ${systemStats.playersByGamesPlayed["1-10"]}
  11-25 games: ${systemStats.playersByGamesPlayed["11-25"]}
  26-50 games: ${systemStats.playersByGamesPlayed["26-50"]}
  51-100 games: ${systemStats.playersByGamesPlayed["51-100"]}
  100+ games: ${systemStats.playersByGamesPlayed["100+"]}

Generated: ${new Date().toISOString()}
`;

    fs.writeFileSync(outputPath, report, "utf-8");
    console.log(`Generated summary report: ${outputPath}`);
  }

  static generateGameResultsJSON(
    gameResults: GameResult[],
    outputPath: string,
  ): void {
    const data = gameResults.map((result) => ({
      matchId: result.matchId,
      gameId: result.gameId,
      date: result.date.toISOString(),
      lobbyRating: Math.round(result.lobbyRating * 100) / 100,
      playerResults: result.playerResults.map((pr) => ({
        playerId: pr.playerId,
        playerName: pr.playerName,
        placement: pr.placement,
        performanceScore: Math.round(pr.performanceScore * 100) / 100,
        mmrChange: Math.round(pr.mmrChange * 100) / 100,
        newMMR: Math.round(pr.newMMR * 100) / 100,
      })),
    }));

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`Generated game results JSON: ${outputPath}`);
  }
}
