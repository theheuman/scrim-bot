import { User } from "discord.js";
import { DB } from "../db/db";
import { nhostDb } from "../db/nhost.db";
import { cache, Cache } from "./cache";
import { ScrimSignup } from "./signups";

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
    commandUser: User,
    oldUser: User,
    newUser: User,
  ) {
    const scrimId = this.cache.getScrimId(discordChannel);
    if (!scrimId) {
      throw Error(
        "No scrim id matching that scrim channel present, contact admin",
      );
    }
    const teamBeingChanged = this.getTeamIfAuthorized(
      commandUser,
      scrimId,
      teamName,
    );
    const oldPlayer = teamBeingChanged.players.find(
      (player) => player.discordId === newUser.id,
    );
    if (!oldPlayer) {
      throw Error("Player being replaced is not on this team");
    }
    const newPlayerId = await this.db.insertPlayerIfNotExists(
      newUser.id as string,
      newUser.displayName,
    );
    return this.db.replaceTeammateNoAuth(
      scrimId,
      teamName,
      oldPlayer.id,
      newPlayerId,
    );
  }

  removeTeam(
    user: User,
    discordChannel: string,
    teamName: string,
  ): Promise<string> {
    const scrimId = this.cache.getScrimId(discordChannel);
    if (!scrimId) {
      throw Error(
        "No scrim id matching that scrim channel present, contact admin",
      );
    }
    const teamToBeChanged = this.getTeamIfAuthorized(user, scrimId, teamName);
    return this.db.removeScrimSignup(teamToBeChanged.teamName, scrimId);
  }

  private getTeamIfAuthorized(
    commandUser: User,
    scrimId: string,
    teamName: string,
  ) {
    const signups = this.cache.getSignups(scrimId);
    if (!signups) {
      throw Error("No teams signed up for this scrim");
    }
    const teamBeingChanged = signups.find((team) => team.teamName === teamName);
    if (!teamBeingChanged) {
      throw Error("No team with that name");
    }
    if (!this.userIsAuthorized(commandUser, teamBeingChanged)) {
      throw Error("User issuing command not authorized to make changes");
    }
    return teamBeingChanged;
  }

  private userIsAuthorized(user: User, team: ScrimSignup) {
    const authorizedPlayers = [team.signupPlayer, ...team.players];
    const foundPlayer = authorizedPlayers.find(
      (player) => player.discordId === user.id,
    );
    // TODO check for discord admin roles here?
    return !!foundPlayer;
  }
}

export const rosters = new RosterService(nhostDb, cache);
export default rosters;
