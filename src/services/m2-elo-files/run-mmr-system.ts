import { MMRFileReaderService } from "./mmr-file-reader.service.js";
import { MMRProcessorService } from "./mmr-processor.service.js";
import { MMROutputService } from "./mmr-output.service.js";
import * as path from "path";

//json directory - uses project folder or D:\downloaded_json if it exists
const JSON_DIRECTORY = path.join(process.cwd(), "downloaded_json");
const OUTPUT_DIRECTORY = path.join(process.cwd(), "mmr_output");

async function main() {
  console.log("=== VESA MMR ===\n");

  // Create output directory if it doesn't exist
  const fs = await import("fs");
  if (!fs.existsSync(OUTPUT_DIRECTORY)) {
    fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
  }

  // all files
  console.log(`Loading scrim files from: ${JSON_DIRECTORY}`);
  const games = MMRFileReaderService.loadAllGameFiles(JSON_DIRECTORY);

  if (games.length === 0) {
    console.error("No games found! Please check the directory path.");
    process.exit(1);
  }

  // Process all games
  console.log("\nProcessing games...");
  const processor = new MMRProcessorService();
  const gameResults = processor.processAllGames(games);

  // player rankings
  console.log("\nGenerating player rankings...");
  const players = processor.getAllPlayerMMRs();

  const systemStats = processor.getSystemStats();

  console.log("\nGenerating output files...");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);

  MMROutputService.generatePlayerRankingsCSV(
    players,
    path.join(OUTPUT_DIRECTORY, `player_rankings_${timestamp}.csv`),
  );

  MMROutputService.generatePlayerRankingsJSON(
    players,
    path.join(OUTPUT_DIRECTORY, `player_rankings_${timestamp}.json`),
  );

  // Game results
  MMROutputService.generateGameResultsJSON(
    gameResults,
    path.join(OUTPUT_DIRECTORY, `game_results_${timestamp}.json`),
  );

  // Summary report
  MMROutputService.generateSummaryReport(
    systemStats,
    path.join(OUTPUT_DIRECTORY, `summary_${timestamp}.txt`),
  );

  // Print summary to console
  console.log("\n=== System Summary ===");
  console.log(`Total Players: ${systemStats.totalPlayers}`);
  console.log(`Total Games: ${systemStats.totalGames}`);
  console.log(`Average MMR: ${systemStats.averageMMR}`);
  console.log(`MMR Range: ${systemStats.minMMR} - ${systemStats.maxMMR}`);
  console.log("\nTop 10 Players:");
  players.slice(0, 10).forEach((player, index) => {
    console.log(
      `${index + 1}. ${player.playerName} - MMR: ${player.currentMMR.toFixed(2)} ` +
        `(${player.gamesPlayed} games, ${player.wins} wins)`,
    );
  });

  console.log(`\nOutput files saved to: ${OUTPUT_DIRECTORY}`);
  console.log("\nDone!");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
