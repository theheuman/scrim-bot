import { User } from "discord.js";
import { DB } from "../db/db";
import { Cache } from "./cache";
import { ScrimSignup } from "./signups";

export class RosterService {
  db: DB;
  cache: Cache;

  constructor(db: DB, cache: Cache) {
    this.db = db;
    this.cache = cache;
  }

  async replaceTeammate(
    commandUser: User,
    discordChannel: string,
    teamName: string,
    oldUser: User,
    newUser: User,
  ): Promise<void> {
    const { teamToBeChanged, scrimId, signups } = this.getDataIfAuthorized(
      commandUser,
      discordChannel,
      teamName,
    );
    for (const team of signups) {
      for (const player of team.players) {
        if (player.discordId === newUser.id) {
          throw Error("New player is already on a team in this scrim");
        }
      }
    }
    let oldPlayerId: string | undefined;
    let oldPlayerIndex = 0;
    for (const player of teamToBeChanged.players) {
      if (player.discordId === oldUser.id) {
        oldPlayerId = player.id;
        break;
      }
      oldPlayerIndex++;
    }
    if (!oldPlayerId) {
      throw Error("Player being replaced is not on this team");
    }
    const newPlayerId = await this.db.insertPlayerIfNotExists(
      newUser.id as string,
      newUser.displayName,
    );
    await this.db.replaceTeammateNoAuth(
      scrimId,
      teamName,
      oldPlayerId,
      newPlayerId,
    );
    teamToBeChanged.players[oldPlayerIndex] = {
      id: newPlayerId,
      discordId: newUser.id as string,
      displayName: newUser.displayName,
    };
  }

  async removeSignup(
    user: User,
    discordChannel: string,
    teamName: string,
  ): Promise<void> {
    const { teamToBeChanged, signups, scrimId } = this.getDataIfAuthorized(
      user,
      discordChannel,
      teamName,
    );
    await this.db.removeScrimSignup(teamToBeChanged.teamName, scrimId);
    signups.splice(signups.indexOf(teamToBeChanged), 1);
  }

  async changeTeamName(
    user: User,
    discordChannel: string,
    oldTeamName: string,
    newTeamName: string,
  ): Promise<void> {
    const { teamToBeChanged, scrimId, signups } = this.getDataIfAuthorized(
      user,
      discordChannel,
      oldTeamName,
    );
    for (const team of signups) {
      if (team.teamName === newTeamName) {
        throw Error("Team name already taken in this scrim set");
      }
    }
    await this.db.changeTeamNameNoAuth(
      scrimId,
      teamToBeChanged.teamName,
      newTeamName,
    );
    teamToBeChanged.teamName = newTeamName;
  }

  private getDataIfAuthorized(
    commandUser: User,
    discordChannel: string,
    teamName: string,
  ): { scrimId: string; signups: ScrimSignup[]; teamToBeChanged: ScrimSignup } {
    const scrimId = this.cache.getScrimId(discordChannel);
    if (!scrimId) {
      throw Error(
        "No scrim id matching that scrim channel present, contact admin",
      );
    }
    const signups = this.cache.getSignups(scrimId);
    if (!signups) {
      throw Error("No teams signed up for this scrim");
    }
    const teamToBeChanged = signups.find((team) => team.teamName === teamName);
    if (!teamToBeChanged) {
      throw Error("No team with that name");
    }
    if (!this.userIsAuthorized(commandUser, teamToBeChanged)) {
      throw Error("User issuing command not authorized to make changes");
    }
    return { scrimId, signups, teamToBeChanged };
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
