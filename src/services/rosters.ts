import { User } from "discord.js";
import { PlayerInsert } from "../models/Player";
import { DB } from "../db/db";
import { nhostDb } from "../db/nhost.db";
import { cache } from "./cache";

export class RosterService {
  db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  async replaceTeammate(
    discordChannel: string,
    teamName: string,
    oldPlayer: User,
    newPlayer: User,
  ) {
    const scrimId = cache.getScrimId(discordChannel);
    if (!scrimId) {
      throw Error(
        "No scrim id matching that scrim channel present, contact admin",
      );
    }

    const convertedOldPlayer: PlayerInsert = {
      discordId: oldPlayer.id as string,
      displayName: oldPlayer.displayName,
    };
    const convertedNewPlayer: PlayerInsert = {
      discordId: newPlayer.id as string,
      displayName: newPlayer.displayName,
    };
    const playerIds = await this.db.insertPlayers([
      convertedOldPlayer,
      convertedNewPlayer,
    ]);
    return this.db.replaceTeammate(
      scrimId,
      teamName,
      playerIds[0],
      playerIds[1],
    );
  }
}

export const rosters = new RosterService(nhostDb);
export default rosters;
