import { User } from "discord.js";
import { PlayerInsert } from "../models/Player";
import { DB } from "../db/db";
import { nhostDb } from "../db/nhost.db";
import { cache, Cache } from "./cache";

export class RosterService {
  db: DB;
  cache: Cache;

  constructor(db: DB, cache: Cache) {
    this.db = db;
    this.cache = cache;
  }

  async replaceTeammate(
    discordChannel: string,
    teamName: string,
    user: User,
    oldPlayer: User,
    newPlayer: User,
  ) {
    const scrimId = this.cache.getScrimId(discordChannel);
    if (!scrimId) {
      throw Error(
        "No scrim id matching that scrim channel present, contact admin",
      );
    }

    const convertedUser: PlayerInsert = {
      discordId: newPlayer.id as string,
      displayName: newPlayer.displayName,
    };
    const convertedOldPlayer: PlayerInsert = {
      discordId: oldPlayer.id as string,
      displayName: oldPlayer.displayName,
    };
    const convertedNewPlayer: PlayerInsert = {
      discordId: newPlayer.id as string,
      displayName: newPlayer.displayName,
    };
    const playerIds = await this.db.insertPlayers([
      convertedUser,
      convertedOldPlayer,
      convertedNewPlayer,
    ]);
    return this.db.replaceTeammate(
      scrimId,
      teamName,
      playerIds[0],
      playerIds[1],
      playerIds[2],
    );
  }

  removeTeam(discordChannel: string, teamName: string): Promise<string> {
    const scrimId = this.cache.getScrimId(discordChannel);
    if (!scrimId) {
      throw Error(
        "No scrim id matching that scrim channel present, contact admin",
      );
    }
    return this.db.removeScrimSignup(teamName, scrimId);
  }
}

export const rosters = new RosterService(nhostDb, cache);
export default rosters;
