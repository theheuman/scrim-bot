import { DB } from "../db/db";
import { User } from "discord.js";
import { CacheService } from "./cache";

export class AuthService {
  constructor(
    private db: DB,
    private cache: CacheService,
  ) {}

  async userIsAdmin(user: User): Promise<boolean> {
    console.log(this.db, this.cache, user);
    // TODO check users roles against a static DB table with roles
    return true;
  }
}
