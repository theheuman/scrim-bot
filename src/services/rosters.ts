import { GuildMember, User } from "discord.js";
import { DB } from "../db/db";
import { CacheService } from "./cache";
import { ScrimSignup } from "../models/Scrims";
import { AuthService } from "./auth";
import { DiscordService } from "./discord";

export class RosterService {
  constructor(
    private db: DB,
    private cache: CacheService,
    private authService: AuthService,
    private discordService: DiscordService,
  ) {}

  async replaceTeammate(
    memberUsingCommand: GuildMember,
    discordChannel: string,
    teamName: string,
    oldUser: User,
    newUser: User,
  ): Promise<ScrimSignup> {
    const { teamToBeChanged, scrimId, signups, isAdmin } =
      await this.getDataIfAuthorized(
        memberUsingCommand,
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
    const newPlayer = await this.db.insertPlayerIfNotExists(
      newUser.id as string,
      newUser.displayName,
    );
    if (!newPlayer.overstatId && !isAdmin) {
      throw Error("New player has no overstat set");
    }
    await this.db.replaceTeammateNoAuth(
      scrimId,
      teamName,
      oldPlayerId,
      newPlayer.id,
    );
    teamToBeChanged.players[oldPlayerIndex] = {
      id: newPlayer.id,
      discordId: newUser.id as string,
      displayName: newUser.displayName,
    };
    return teamToBeChanged;
  }

  async removeSignup(
    memberUsingCommand: GuildMember,
    discordChannel: string,
    teamName: string,
  ): Promise<void> {
    const { teamToBeChanged, signups, scrimId } =
      await this.getDataIfAuthorized(
        memberUsingCommand,
        discordChannel,
        teamName,
      );
    await this.db.removeScrimSignup(teamToBeChanged.teamName, scrimId);
    signups.splice(signups.indexOf(teamToBeChanged), 1);
    this.updateScrimSignupCount(discordChannel);
  }

  async changeTeamName(
    memberUsingCommand: GuildMember,
    discordChannel: string,
    oldTeamName: string,
    newTeamName: string,
  ): Promise<void> {
    const { teamToBeChanged, scrimId, signups } =
      await this.getDataIfAuthorized(
        memberUsingCommand,
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

  private async getDataIfAuthorized(
    memberUsingCommand: GuildMember,
    discordChannel: string,
    teamName: string,
  ): Promise<{
    scrimId: string;
    signups: ScrimSignup[];
    teamToBeChanged: ScrimSignup;
    isAdmin: boolean;
  }> {
    const scrimId = this.cache.getScrim(discordChannel)?.id;
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
    const isAdmin = await this.authService.memberIsAdmin(memberUsingCommand);
    const isOnTeam = this.memberIsOnTeam(memberUsingCommand, teamToBeChanged);
    if (!isOnTeam && !isAdmin) {
      throw Error("User issuing command not authorized to make changes");
    }
    return { scrimId, signups, teamToBeChanged, isAdmin };
  }

  private memberIsOnTeam(member: GuildMember, team: ScrimSignup): boolean {
    const authorizedPlayers = [team.signupPlayer, ...team.players];
    const foundPlayer = authorizedPlayers.find(
      (player) => player.discordId === member.id,
    );

    return !!foundPlayer;
  }

  private async updateScrimSignupCount(discordChannel: string) {
    const scrim = this.cache.getScrim(discordChannel);

    try {
      if (!scrim) {
        throw Error("No scrim for that channel");
      }
      const count = this.cache.getSignups(scrim.id)?.length ?? 0;
      await this.discordService.updateSignupPostDescription(scrim, count);
    } catch (e) {
      console.error(
        "Unable to update scrim signup count for ",
        scrim?.id,
        scrim?.discordChannel,
        e,
      );
    }
  }
}
