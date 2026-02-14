import { MMRCalculator } from "../../../src/services/elo/mmr-calculator";

describe("MMRCalculator", () => {
  describe("getPlacementPoints", () => {
    it("should return correct points for top placements", () => {
      expect(MMRCalculator.getPlacementPoints(1)).toBe(16);
      expect(MMRCalculator.getPlacementPoints(2)).toBe(12);
      expect(MMRCalculator.getPlacementPoints(3)).toBe(10);
    });

    it("should return 0 for placements >= 11", () => {
      expect(MMRCalculator.getPlacementPoints(11)).toBe(0);
      expect(MMRCalculator.getPlacementPoints(20)).toBe(0);
    });

    it("should return 0 for invalid placements", () => {
      expect(MMRCalculator.getPlacementPoints(0)).toBe(0);
      expect(MMRCalculator.getPlacementPoints(21)).toBe(0);
    });
  });

  describe("calculatePerformanceScore", () => {
    it("should calculate correct score based on weights", () => {
      // 1st place (16 pts), 5 kills, 2 assists, 1000 damage, 1 revive
      // Score = (16 * 0.55) + ((5+2) * 0.3) + ((1000/100) * 0.1) + (1 * 0.5)
      //       = 8.8 + 2.1 + 1.0 + 0.5 = 12.4
      const score = MMRCalculator.calculatePerformanceScore(1, 5, 2, 1000, 1);
      expect(score).toBeCloseTo(12.4);
    });
  });

  describe("calculateLobbyRating", () => {
    it("should return average of non-empty MMR list", () => {
      const mmrs = [1000, 2000, 1500];
      expect(MMRCalculator.calculateLobbyRating(mmrs)).toBe(1500);
    });

    it("should return INITIAL_MMR for empty list", () => {
      expect(MMRCalculator.calculateLobbyRating([])).toBe(
        MMRCalculator.INITIAL_MMR,
      );
    });
  });

  describe("calculateMMRChange", () => {
    const lobbyRating = 1500;
    const avgPerf = 10;

    it("should cap positive change at MAX_MMR_CHANGE", () => {
      // High performance, low mmr -> big gain
      const change = MMRCalculator.calculateMMRChange(
        1000,
        lobbyRating,
        50,
        avgPerf,
      );
      expect(change).toBeLessThanOrEqual(MMRCalculator.MAX_MMR_CHANGE);
    });

    it("should cap negative change at -MAX_MMR_CHANGE", () => {
      // Low performance, high mmr -> big loss
      const change = MMRCalculator.calculateMMRChange(
        2000,
        lobbyRating,
        0,
        avgPerf,
      );
      expect(change).toBeGreaterThanOrEqual(-MMRCalculator.MAX_MMR_CHANGE);
    });

    it("should give higher gains for lower MMR players (catch-up)", () => {
      // Player 1: 1200 MMR (Below lobby)
      // Player 2: 1800 MMR (Above lobby)
      // Both perform equally well above average
      const score = 15; // Above avg 10

      const changeLow = MMRCalculator.calculateMMRChange(
        1200,
        lobbyRating,
        score,
        avgPerf,
      );
      const changeHigh = MMRCalculator.calculateMMRChange(
        1800,
        lobbyRating,
        score,
        avgPerf,
      );

      expect(changeLow).toBeGreaterThan(changeHigh);
    });

    it("should give higher losses for higher MMR players", () => {
      // Both perform equally poor below average
      const score = 5; // Below avg 10

      const changeLow = MMRCalculator.calculateMMRChange(
        1200,
        lobbyRating,
        score,
        avgPerf,
      );
      const changeHigh = MMRCalculator.calculateMMRChange(
        1800,
        lobbyRating,
        score,
        avgPerf,
      );

      // changeHigh should be more negative (smaller) than changeLow
      expect(changeHigh).toBeLessThan(changeLow);
    });
  });

  describe("updateMMR", () => {
    it("should apply change correctly", () => {
      expect(MMRCalculator.updateMMR(1500, 15.5)).toBe(1515.5);
      expect(MMRCalculator.updateMMR(1500, -10)).toBe(1490);
    });

    it("should not go below 0", () => {
      expect(MMRCalculator.updateMMR(10, -20)).toBe(0);
    });
  });
});
