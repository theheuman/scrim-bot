import { DB } from "../db/db";
import { User } from "discord.js";
import { AuthService } from "./auth";
import { CacheService } from "./cache";

export class PrioService {
  constructor(
    private db: DB,
    private cache: CacheService,
    private authService: AuthService,
  ) {}

  // TODO multiple users in one prio call, will need to edit db.insertPlayerIfNotExists or add additional method
  async setPrio(
    commandUser: User,
    prioUser: User,
    startDate: Date,
    endDate: Date,
    amount: number,
    reason: string,
  ) {
    const isAuthorized = await this.authService.userIsAdmin(commandUser);
    if (!isAuthorized) {
      throw Error("User not authorized");
    }
    const prioPlayer = this.cache.getPlayer(prioUser.id as string);
    let prioPlayerId = prioPlayer?.id;
    if (!prioPlayerId) {
      prioPlayerId = await this.db.insertPlayerIfNotExists(
        prioUser.id as string,
        prioUser.displayName,
      );
    }
    const ids = await this.db.post("prio", [
      {
        player_id: prioPlayerId,
        start_date: startDate,
        end_date: endDate,
        amount,
        reason,
      },
    ]);
    return ids[0];
  }
}
