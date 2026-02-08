import { DB } from "../db/db";
import {
  OverstatTournamentResponse,
  GameResponse,
  PlayerGameStats,
} from "../models/overstatModels";

export class EloService {
  constructor(private db: DB) {}

  // take in overstat json and use private methods to modify each players elo
  // since this algorithm takes it game by game, store elo changes locally until whole set has been computed
  calculateEloForLobby(overstatJson: OverstatTournamentResponse) {}

  private calculateEloForGame(gameJson: GameResponse) {}
  private calculateLobbyRating(playerMMRs: number[]) {}
  private calculatePlayerPerformanceScore(playerStats: PlayerGameStats) {}
}
