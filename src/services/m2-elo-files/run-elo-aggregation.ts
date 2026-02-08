import {
  EloAggregationService,
  printEloCalculationBreakdown,
} from "./elo-aggregation.service.js";
import type { PlayerAggregatedStats } from "./elo-aggregation.service.js";
import * as fs from "fs";
import * as path from "path";

// files
const DATA_DIR = process.env.DATA_DIR || "D:\\downloaded_json";
const OUTPUT_FILE = process.env.OUTPUT_FILE || "aggregated_player_stats.json";
const RUN_ANALYSIS = process.env.RUN_ANALYSIS !== "false"; // Default to true

type MatchDayResults = { [gameNumber: string]: any[] };

function createScrimFileService(dataDir: string) {
  return {
    getAllScrimBatchFiles: (): string[] => {
      if (!fs.existsSync(dataDir)) {
        console.warn(`Data directory does not exist: ${dataDir}`);
        return [];
      }
      return fs
        .readdirSync(dataDir)
        .filter((file) => file.endsWith(".json") && file.startsWith("scrim_"))
        .map((file) => path.join(dataDir, file));
    },
    loadAllScrimBatchFilesSync: (fileNames: string[]): any[] => {
      return fileNames
        .map((file) => {
          try {
            const content = fs.readFileSync(file, "utf-8");
            return JSON.parse(content);
          } catch (error) {
            console.warn(`Error loading ${file}:`, error);
            return null;
          }
        })
        .filter((x) => x !== null);
    },
  };
}

function loadScrimTableFromJsonObject(json: any): MatchDayResults {
  let games: any[] = [];

  if (json.games && Array.isArray(json.games)) {
    games = json.games;
  } else if (
    json.stats &&
    json.stats.games &&
    Array.isArray(json.stats.games)
  ) {
    games = json.stats.games;
  } else if (Array.isArray(json)) {
    games = json;
  } else if (json.data && Array.isArray(json.data)) {
    games = json.data;
  } else {
    return {};
  }

  const matchDay: { [key: string]: any[] } = {};

  games.forEach((game: any, gameIdx: number) => {
    if (!game.teams && !game.team_stats) return;

    const teams = game.teams || game.team_stats || [];
    const gameNumber = (gameIdx + 1).toString();

    matchDay[gameNumber] = teams.map((team: any) => ({
      placement:
        team.overall_stats?.teamPlacement ||
        team.overall_stats?.position ||
        team.placement ||
        10,
      players: (team.player_stats || team.players || []).map((player: any) => ({
        playerId: player.playerId || player.id,
        playerName: player.name || player.playerName,
        placement:
          team.overall_stats?.teamPlacement ||
          team.overall_stats?.position ||
          team.placement ||
          10,
        kills: player.kills || 0,
        assists: player.assists || 0,
        damageDealt: player.damageDealt || player.damage || 0,
        revivesGiven: player.revivesGiven || player.revives || 0,
        score: player.score || 0,
      })),
    }));
  });

  return matchDay;
}

// run eloalggreation on dataset
async function runEloAggregation() {
  console.log("=== Running Elo Aggregation Service ===\n");
  console.log(`Data Directory: ${DATA_DIR}`);
  console.log(`Output File: ${OUTPUT_FILE}\n`);

  const scrimFileService = createScrimFileService(DATA_DIR);

  const fileNames = scrimFileService.getAllScrimBatchFiles();
  if (fileNames.length === 0) {
    console.error("No data files found!");
    console.error(
      `Please check that the data directory exists and contains JSON files starting with "scrim_": ${DATA_DIR}`,
    );
    return;
  }

  console.log(`Found ${fileNames.length} data file(s) to process\n`);

  console.log("Running aggregatePlayerElos...");
  const startTime = Date.now();

  const playerStats = EloAggregationService.aggregatePlayerElos(
    scrimFileService,
    loadScrimTableFromJsonObject,
  );

  const endTime = Date.now();
  const processingTime = ((endTime - startTime) / 1000).toFixed(2);

  console.log(
    `\n✓ Processed ${playerStats.length} players in ${processingTime} seconds\n`,
  );

  if (RUN_ANALYSIS && playerStats.length > 0) {
    console.log("Running analyzeEloEngagement...");
    try {
      EloAggregationService.analyzeEloEngagement(
        playerStats.map((p) => ({
          playerName: p.playerName,
          estimatedElo: p.finalElo,
          totalGames: p.totalGames,
        })),
        50,
      );
    } catch (error) {
      console.warn("Error running analyzeEloEngagement:", error);
    }
  }

  // Save to file
  const outputPath = path.isAbsolute(OUTPUT_FILE)
    ? OUTPUT_FILE
    : path.join(process.cwd(), OUTPUT_FILE);

  fs.writeFileSync(outputPath, JSON.stringify(playerStats, null, 2));
  console.log(`\n✓ Results saved to: ${outputPath}`);

  // Print summary statistics
  console.log("\n" + "=".repeat(80));
  console.log("Summary Statistics:");
  console.log(`  Total Players: ${playerStats.length}`);

  if (playerStats.length > 0) {
    const sortedByElo = [...playerStats].sort(
      (a, b) => b.finalElo - a.finalElo,
    );
    const avgElo =
      playerStats.reduce((sum, p) => sum + p.finalElo, 0) / playerStats.length;
    const avgGames =
      playerStats.reduce((sum, p) => sum + p.totalGames, 0) /
      playerStats.length;
    const avgWinRate =
      playerStats.reduce((sum, p) => sum + p.winRate, 0) / playerStats.length;

    console.log(`  Average ELO: ${avgElo.toFixed(2)}`);
    const topPlayer = sortedByElo[0];
    const bottomPlayer = sortedByElo[sortedByElo.length - 1];
    if (topPlayer && bottomPlayer) {
      console.log(
        `  Highest ELO: ${topPlayer.finalElo.toFixed(2)} (${topPlayer.playerName})`,
      );
      console.log(
        `  Lowest ELO: ${bottomPlayer.finalElo.toFixed(2)} (${bottomPlayer.playerName})`,
      );
    }
    console.log(`  Average Games Played: ${avgGames.toFixed(1)}`);
    console.log(`  Average Win Rate: ${avgWinRate.toFixed(2)}%`);

    // Show top 10?? players
    console.log("\nTop 10 Players by ELO:");
    console.log(
      "Rank".padEnd(6) +
        "Player Name".padEnd(30) +
        "ELO".padEnd(10) +
        "Games".padEnd(8) +
        "Win Rate".padEnd(10),
    );
    console.log("-".repeat(64));
    sortedByElo.slice(0, 10).forEach((player, idx) => {
      console.log(
        (idx + 1).toString().padEnd(6) +
          player.playerName.padEnd(30) +
          player.finalElo.toFixed(1).padEnd(10) +
          player.totalGames.toString().padEnd(8) +
          `${player.winRate.toFixed(1)}%`.padEnd(10),
      );
    });
  }

  console.log("\n" + "=".repeat(80));
}

// Run the aggregation
runEloAggregation().catch(console.error);
