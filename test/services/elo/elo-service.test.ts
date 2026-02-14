import { EloService } from "../../../src/services/elo/elo-service";
import { MMRCalculator } from "../../../src/services/elo/mmr-calculator";
import {
  GameResponse,
  OverstatTournamentResponse,
} from "../../../src/models/overstatModels";
import { DB } from "../../../src/db/db";
import { HuggingFaceService } from "../../../src/services/hugging-face";

// Mock dependencies
const mockDB = {} as unknown as DB;
const mockHuggingFaceService = {} as unknown as HuggingFaceService;

describe("EloService", () => {
  let eloService: EloService;

  beforeEach(() => {
    eloService = new EloService(mockDB, mockHuggingFaceService);
  });

  describe("processGame", () => {
    it("should process game and return new MMRs", () => {
      // Setup mock data
      const player1Id = "player1";
      const player2Id = "player2";
      const currentElos = new Map<string | number, number>();
      currentElos.set(player1Id, 1500);
      currentElos.set(player2Id, 1600);

      const game: GameResponse = {
        mid: "game1",
        map: "",
        teams: [
          {
            name: "Team 1",
            player_stats: [
              {
                playerId: player1Id,
                name: "P1",
                teamPlacement: 1,
                kills: 5,
                assists: 2,
                damageDealt: 1000,
                revivesGiven: 1,
              },
            ],
            overall_stats: {},
          },
          {
            name: "Team 2",
            player_stats: [
              {
                playerId: player2Id,
                name: "P2",
                teamPlacement: 20,
                kills: 0,
                assists: 0,
                damageDealt: 0,
                revivesGiven: 0,
              },
            ],
            overall_stats: {},
          },
        ],
        aim_assist_allowed: true,
        total_players: 2,
      } as unknown as GameResponse;

      // Spy on calculator methods to ensure they are called
      const calcLobbySpy = jest.spyOn(MMRCalculator, "calculateLobbyRating");
      const calcPerfSpy = jest.spyOn(
        MMRCalculator,
        "calculatePerformanceScore",
      );
      const calcChangeSpy = jest.spyOn(MMRCalculator, "calculateMMRChange");
      const updateMMRSpy = jest.spyOn(MMRCalculator, "updateMMR");

      const newElos = eloService.processGame(game, currentElos);

      expect(newElos.size).toBe(2);
      expect(newElos.has(player1Id)).toBe(true);
      expect(newElos.has(player2Id)).toBe(true);

      // Verify calculator calls
      expect(calcLobbySpy).toHaveBeenCalled();
      expect(calcPerfSpy).toHaveBeenCalledTimes(2);
      expect(calcChangeSpy).toHaveBeenCalledTimes(2);
      expect(updateMMRSpy).toHaveBeenCalledTimes(2);

      // P1 should gain MMR (1st place)
      expect(newElos.get(player1Id)).toBeGreaterThan(1500);

      // P2 should lose MMR (20th place)
      expect(newElos.get(player2Id)).toBeLessThan(1600);
    });

    it("should handle players with no previous Elo", () => {
      const player1Id = "newPlayer";
      const currentElos = new Map<string | number, number>();
      // map is empty

      const game: GameResponse = {
        mid: "game1",
        map: "",
        teams: [
          {
            name: "Team 1",
            player_stats: [
              {
                playerId: player1Id,
                name: "P1",
                teamPlacement: 5,
                kills: 1,
                assists: 1,
                damageDealt: 500,
                revivesGiven: 0,
              },
            ],
            overall_stats: {},
          },
        ],
        aim_assist_allowed: true,
        total_players: 1,
      } as unknown as GameResponse;

      const newElos = eloService.processGame(game, currentElos);

      expect(newElos.has(player1Id)).toBe(true);
      // Should not be undefined or NaN
      expect(newElos.get(player1Id)).not.toBeNaN();
    });
  });

  describe("processTournament", () => {
    beforeEach(() => {
      mockDB.getPlayersByOverstatIds = jest.fn();
      mockDB.updatePlayerElo = jest.fn();
    });

    it("should process tournament and update player Elos in DB", async () => {
      const player1Id = "123";
      const stats: OverstatTournamentResponse = {
        games: [
          {
            teams: [
              {
                player_stats: [{ playerId: Number(player1Id) }],
              },
            ],
          },
        ],
      } as any;

      const existingPlayer = { overstatId: player1Id, elo: 1500 };
      (mockDB.getPlayersByOverstatIds as jest.Mock).mockResolvedValue([
        existingPlayer,
      ]);

      // Mock processGame to return 1600
      jest
        .spyOn(eloService, "processGame")
        .mockReturnValue(new Map([[player1Id, 1600]]));

      await eloService.processTournament(stats);

      expect(mockDB.getPlayersByOverstatIds).toHaveBeenCalledWith([player1Id]);
      expect(mockDB.updatePlayerElo).toHaveBeenCalledWith(player1Id, 1600);
    });

    it("should not update DB if Elo remains the same", async () => {
      const player1Id = "123";
      const stats: OverstatTournamentResponse = {
        games: [
          {
            teams: [
              {
                player_stats: [{ playerId: Number(player1Id) }],
              },
            ],
          },
        ],
      } as any;

      const existingPlayer = { overstatId: player1Id, elo: 1500 };
      (mockDB.getPlayersByOverstatIds as jest.Mock).mockResolvedValue([
        existingPlayer,
      ]);

      jest
        .spyOn(eloService, "processGame")
        .mockReturnValue(new Map([[player1Id, 1500]]));

      await eloService.processTournament(stats);

      expect(mockDB.updatePlayerElo).not.toHaveBeenCalled();
    });
  });
});
