export class MMRCalculator {
  static readonly INITIAL_MMR = 1500;
  static placementWeight = 0.55;
  static combatWeight = 0.3;
  static damageWeight = 0.1;
  static supportWeight = 0.5;
  static readonly MAX_MMR_CHANGE = 20;
  static readonly BASE_K_FACTOR = 15;

  static getPlacementPoints(placement: number): number {
    const placementPoints: { [key: number]: number } = {
      1: 16,
      2: 12,
      3: 10,
      4: 8,
      5: 6,
      6: 4,
      7: 4,
      8: 2,
      9: 2,
      10: 1,
      11: 0,
      12: 0,
      13: 0,
      14: 0,
      15: 0,
      16: 0,
      17: 0,
      18: 0,
      19: 0,
      20: 0,
    };

    return placementPoints[placement] || 0;
  }

  // performance score based on game stats
  // (Placement*placementWeight) + ((kills+assists)*combatWeight) + ((damageDealt/100)*damageWeight) + (revives*supportWeight)

  static calculatePerformanceScore(
    placement: number,
    kills: number,
    assists: number,
    damageDealt: number,
    revives: number,
  ): number {
    const placementPoints = this.getPlacementPoints(placement);
    const combatScore = kills + assists;

    const perfScore =
      placementPoints * this.placementWeight +
      combatScore * this.combatWeight +
      (damageDealt / 100) * this.damageWeight +
      revives * this.supportWeight;

    return perfScore;
  }

  static calculateLobbyRating(playerMMRs: number[]): number {
    if (playerMMRs.length === 0) return this.INITIAL_MMR;
    const sum = playerMMRs.reduce((acc, mmr) => acc + mmr, 0);
    return sum / playerMMRs.length;
  }

  static calculateMMRChange(
    playerMMR: number,
    lobbyRating: number,
    performanceScore: number,
    averagePerformanceScore: number,
  ): number {
    const performanceDiff = performanceScore - averagePerformanceScore;

    const normalizedDiff =
      averagePerformanceScore > 0
        ? performanceDiff / averagePerformanceScore
        : performanceDiff / 1000;

    const baseKFactor = 12;
    const baseChange = normalizedDiff * baseKFactor;

    const mmrDiff = playerMMR - lobbyRating;
    const mmrDiffPercent = Math.abs(mmrDiff) / Math.max(lobbyRating, 1);

    // player MMR relative to lobby
    let multiplier = 1.0;

    if (mmrDiff < 0) {
      // mmr > lobby avg - higher gains, lower losses
      if (baseChange > 0) {
        multiplier = 1.0 + Math.min(mmrDiffPercent * 1.5, 0.4);
      } else {
        multiplier = 1.0 - Math.min(mmrDiffPercent * 1.2, 0.25);
      }
    } else if (mmrDiff > 0) {
      // mmr > lobby avg - lower gains, higher losses
      if (baseChange > 0) {
        multiplier = 1.0 - Math.min(mmrDiffPercent * 1.2, 0.25);
      } else {
        multiplier = 1.0 + Math.min(mmrDiffPercent * 1.5, 0.4);
      }
    }

    let mmrChange = baseChange * multiplier;

    mmrChange = Math.max(
      -this.MAX_MMR_CHANGE,
      Math.min(this.MAX_MMR_CHANGE, mmrChange),
    );
    return Math.round(mmrChange * 100) / 100; //
  }
  static updateMMR(currentMMR: number, mmrChange: number): number {
    return Math.max(0, currentMMR + mmrChange); // mmr cant go below 0
  }
}
