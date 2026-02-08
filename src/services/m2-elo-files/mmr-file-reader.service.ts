import * as fs from "fs";
import * as path from "path";

export interface GameData {
  matchId: string;
  date: Date;
  games: Array<{
    id: number;
    game: number;
    match_start: number;
    teams: Array<{
      teamId: number;
      name: string;
      overall_stats: {
        teamPlacement: number;
        kills: number;
        assists: number;
        damageDealt: number;
        revivesGiven: number;
      };
      player_stats: Array<{
        playerId: number;
        name: string;
        teamPlacement: number;
        kills: number;
        assists: number;
        damageDealt: number;
        revivesGiven?: number;
        revives?: number;
      }>;
    }>;
  }>;
}

export interface ProcessedGame {
  matchId: string;
  gameId: number;
  gameNumber: number;
  date: Date;
  players: Array<{
    playerId: number;
    playerName: string;
    teamId: number;
    teamName: string;
    placement: number;
    kills: number;
    assists: number;
    damageDealt: number;
    revives: number;
  }>;
}

export class MMRFileReaderService {
  // get all scrim json files from directory
  static getAllGameFiles(directoryPath: string): string[] {
    try {
      const files = fs.readdirSync(directoryPath);
      const gameFiles = files
        .filter(
          (file) =>
            file.endsWith(".json") &&
            (file.startsWith("scrim_") || file.startsWith("overstat_")),
        )
        .map((file) => path.join(directoryPath, file))
        .sort((a, b) => {
          const dateA = this.extractDateFromFilename(a);
          const dateB = this.extractDateFromFilename(b);
          if (dateA && dateB) {
            return dateA.getTime() - dateB.getTime();
          }
          return a.localeCompare(b);
        });

      return gameFiles;
    } catch (error) {
      console.error(`Can't access directory ${directoryPath}:`, error);
      return [];
    }
  }

  // date of scrim
  static extractDateFromFilename(filePath: string): Date | null {
    const filename = path.basename(filePath);
    const scrimMatch = filename.match(
      /scrim_(\d{4})_(\d{2})_(\d{2})_id_(\d+)\.json/,
    );
    if (scrimMatch?.[1] && scrimMatch[2] && scrimMatch[3]) {
      const year = parseInt(scrimMatch[1], 10);
      const month = parseInt(scrimMatch[2], 10) - 1;
      const day = parseInt(scrimMatch[3], 10);
      return new Date(year, month, day);
    }
    const overstatMatch = filename.match(/overstat_\d+_(\d+)\.json/);
    if (overstatMatch?.[1]) {
      const ts = parseInt(overstatMatch[1], 10);
      if (ts > 1e9) return new Date(ts * 1000);
    }
    return null;
  }

  // single file loading & processing

  static loadGameFile(filePath: string): GameData | null {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(content) as Record<string, unknown>;
      const games = (data.games as GameData["games"]) || [];
      const matchId = String(data.matchId ?? path.basename(filePath));

      let date = this.extractDateFromFilename(filePath);
      if (!date && games.length > 0) {
        const firstGame = games[0];
        const matchStart = (firstGame as { match_start?: number }).match_start;
        if (typeof matchStart === "number") {
          date = new Date(matchStart * 1000);
        }
      }
      if (!date) {
        console.warn(`Could not extract date from filename: ${filePath}`);
      }

      return {
        matchId,
        date: date || new Date(),
        games,
      };
    } catch (error) {
      console.error(`Error loading file ${filePath}:`, error);
      return null;
    }
  }

  //process and format scrim data

  static processGameData(gameData: GameData): ProcessedGame[] {
    const processedGames: ProcessedGame[] = [];

    for (const game of gameData.games) {
      const players: ProcessedGame["players"] = [];
      const gameWithMatchStart = game as { match_start?: number };

      for (const team of game.teams || []) {
        const teamPlacement = team.overall_stats?.teamPlacement ?? 0;

        for (const player of team.player_stats || []) {
          players.push({
            playerId: player.playerId,
            playerName: player.name,
            teamId: team.teamId,
            teamName: team.name,
            placement: player.teamPlacement ?? teamPlacement,
            kills: player.kills ?? 0,
            assists: player.assists ?? 0,
            damageDealt: player.damageDealt ?? 0,
            revives: player.revivesGiven ?? player.revives ?? 0,
          });
        }
      }

      const gameDate =
        typeof gameWithMatchStart.match_start === "number"
          ? new Date(gameWithMatchStart.match_start * 1000)
          : gameData.date;

      processedGames.push({
        matchId: gameData.matchId,
        gameId: game.id,
        gameNumber: game.game ?? 1,
        date: gameDate,
        players,
      });
    }

    return processedGames;
  }

  // single scrim file...not sure if useful.
  static loadSingleFile(filePath: string): ProcessedGame[] {
    const gameData = this.loadGameFile(filePath);
    if (!gameData) return [];
    return this.processGameData(gameData);
  }

  // loads all in chronological order.

  static loadAllGameFiles(directoryPath: string): ProcessedGame[] {
    const files = this.getAllGameFiles(directoryPath);
    const allGames: ProcessedGame[] = [];

    for (const file of files) {
      const gameData = this.loadGameFile(file);
      if (gameData) {
        const processed = this.processGameData(gameData);
        allGames.push(...processed);
      }
    }

    allGames.sort((a, b) => {
      const dateDiff = a.date.getTime() - b.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.gameNumber - b.gameNumber;
    });

    return allGames;
  }
}
