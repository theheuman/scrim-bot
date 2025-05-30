import { GuildMember, User } from "discord.js";
import { Player, PlayerInsert, PlayerStatInsert } from "../models/Player";
import { DB } from "../db/db";
import { ScrimSignupsWithPlayers } from "../db/table.interfaces";
import { CacheService } from "./cache";
import { OverstatService } from "./overstat";
import { Scrim, ScrimSignup } from "../models/Scrims";
import { PrioService } from "./prio";
import { appConfig } from "../config";
import { AuthService } from "./auth";
import { DiscordService } from "./discord";

export class ScrimSignups {
  constructor(
    private db: DB,
    private cache: CacheService,
    private overstatService: OverstatService,
    private prioService: PrioService,
    private authService: AuthService,
    private discordService: DiscordService,
  ) {
    this.updateActiveScrims();
  }

  async updateActiveScrims(log?: boolean) {
    const activeScrims = await this.db.getActiveScrims();
    for (const scrim of activeScrims) {
      if (scrim.id && scrim.discord_channel) {
        const mappedScrim: Scrim = {
          active: true,
          dateTime: new Date(scrim.date_time_field),
          discordChannel: scrim.discord_channel,
          id: scrim.id,
        };
        this.cache.createScrim(scrim.discord_channel, mappedScrim);
        if (log) {
          console.log("Added scrim channel", this.cache);
        }
        this.getSignups(scrim.discord_channel);
      }
    }
  }

  async createScrim(discordChannelID: string, dateTime: Date): Promise<string> {
    const scrimId = await this.db.createNewScrim(dateTime, discordChannelID);
    const scrim: Scrim = {
      active: true,
      dateTime: dateTime,
      discordChannel: discordChannelID,
      id: scrimId,
    };
    this.cache.createScrim(discordChannelID, scrim);
    return scrimId;
  }

  getScrim(discordChannelID: string): Scrim | undefined {
    return this.cache.getScrim(discordChannelID);
  }

  // this is a dynamic method that checks if scores have already been computed for a given discordChannel
  // if they have been computed it creates a new scrim entry in the db and computes stats for that one
  // this solves the problem of having multiple lobbies in one scrim.
  async computeScrim(
    discordChannelID: string,
    overstatLink: string,
    skill: number,
  ) {
    const scrim = this.cache.getScrim(discordChannelID);
    if (!scrim) {
      throw Error("No scrim found for that channel");
    }
    let scrimId = scrim.id;
    const signups = this.cache.getSignups(scrimId);
    if (!signups) {
      throw Error("No signups for that scrim");
    }
    if (
      scrim.skill &&
      scrim.overstatLink &&
      scrim.overstatLink !== overstatLink
    ) {
      scrimId = await this.db.createNewScrim(
        scrim.dateTime,
        scrim.discordChannel,
      );
    }
    const stats = await this.overstatService.getOverallStats(overstatLink);
    const playerStats: PlayerStatInsert[] = this.overstatService.matchPlayers(
      scrimId,
      signups,
      stats,
    );

    await this.db.computeScrim(scrimId, overstatLink, skill, playerStats);
    scrim.overstatLink = overstatLink;
    scrim.skill = skill;
  }

  async closeScrim(discordChannelID: string) {
    const scrimId = this.cache.getScrim(discordChannelID)?.id;
    if (!scrimId) {
      throw Error("No scrim found for that channel");
    }
    await this.db.closeScrim(discordChannelID);
    this.cache.removeScrimChannel(discordChannelID);
  }

  async addTeam(
    discordChannelID: string,
    teamName: string,
    commandUser: GuildMember,
    players: User[],
  ): Promise<ScrimSignup> {
    const scrim = this.cache.getScrim(discordChannelID);
    if (!scrim) {
      throw Error("No scrim found for that channel");
    }
    if (players.length !== 3) {
      throw Error("Exactly three players must be provided");
    } else if (
      players[0].id === players[1].id ||
      players[0].id === players[2].id ||
      players[1].id === players[2].id
    ) {
      throw Error("Duplicate player");
    }

    const scrimSignups = this.cache.getSignups(scrim.id) ?? [];
    // yes this is a three deep for loop, this is a cry for help, please optimize this
    for (const team of scrimSignups) {
      if (team.teamName === teamName) {
        throw Error("Duplicate team name");
      }
      for (const id of team.players.map((player) => player.discordId)) {
        for (const player of players) {
          if (player.id === id) {
            throw Error(
              `Player already signed up on different team: ${player.displayName} <@${id}> on team ${team.teamName}`,
            );
          }
        }
      }
    }
    const playersToInsert = [commandUser, ...players];
    const convertedPlayers: PlayerInsert[] = playersToInsert.map(
      (discordUser) => ({
        discordId: discordUser.id as string,
        displayName: discordUser.displayName,
      }),
    );
    const insertedPlayers = await this.db.insertPlayers(convertedPlayers);
    await this.checkForMissingOverstat(insertedPlayers.slice(1), commandUser);
    const signupDate = new Date();
    const signupId = await this.db.addScrimSignup(
      teamName,
      scrim.id,
      insertedPlayers[0].id,
      insertedPlayers[1].id,
      insertedPlayers[2].id,
      insertedPlayers[3].id,
      signupDate,
    );
    const scrimSignup: ScrimSignup = {
      teamName: teamName,
      players: insertedPlayers.slice(1),
      signupPlayer: insertedPlayers[0],
      signupId,
      date: signupDate,
    };
    scrimSignups.push(scrimSignup);
    this.cache.setSignups(scrim.id, scrimSignups);
    this.updateScrimSignupCount(scrim);
    return scrimSignup;
  }

  private async checkForMissingOverstat(
    players: Player[],
    commandMember: GuildMember,
  ) {
    if (await this.authService.memberIsAdmin(commandMember)) {
      return;
    }
    for (const player of players) {
      if (!player.overstatId) {
        throw Error(
          `No overstat linked for ${player.displayName}. Use /link-overstat in https://discord.com/channels/1043350338574495764/1341877592139104376. Don't have an overstat? Create a https://discord.com/channels/1043350338574495764/1335824833757450263 and let an admin know your signup information so they can complete it for you`,
        );
      }
    }
  }

  async getSignups(
    discordChannelID: string,
    discordIdsWithScrimPass?: string[],
  ): Promise<{ mainList: ScrimSignup[]; waitList: ScrimSignup[] }> {
    const scrim = this.cache.getScrim(discordChannelID);
    if (!scrim) {
      throw Error("No scrim found for that channel");
    }
    const scrimData = await this.db.getScrimSignupsWithPlayers(scrim.id);
    const teams: ScrimSignup[] = [];
    for (const signupData of scrimData) {
      const teamData: ScrimSignup =
        ScrimSignups.convertDbToScrimSignup(signupData);
      teams.push(teamData);
    }
    const prioTeams = await this.prioService.getTeamPrioForScrim(
      scrim,
      teams,
      discordIdsWithScrimPass ?? [],
    );
    this.cache.setSignups(scrim.id, prioTeams);
    return this.sortTeams(teams);
  }

  private sortTeams(teams: ScrimSignup[]): {
    mainList: ScrimSignup[];
    waitList: ScrimSignup[];
  } {
    const lobbySize = appConfig.lobbySize;
    const waitlistCutoff =
      lobbySize * Math.floor(teams.length / lobbySize) || lobbySize;
    const sortedTeams = [...teams].sort((teamA, teamB) => {
      const lowPrioResult =
        (teamB.prio?.amount ?? 0) - (teamA.prio?.amount ?? 0);
      if (lowPrioResult === 0) {
        // lower date is better, so subtract b from a
        return teamA.date.valueOf() - teamB.date.valueOf();
      }
      return lowPrioResult;
    });
    return {
      mainList: sortedTeams.splice(0, waitlistCutoff),
      waitList: sortedTeams,
    };
  }

  static convertDbToScrimSignup(
    dbTeamData: ScrimSignupsWithPlayers,
  ): ScrimSignup {
    const convertedTeamData = this.convertToPlayers(dbTeamData);
    return {
      signupId: "for now we dont get the id",
      teamName: dbTeamData.team_name,
      players: convertedTeamData.players,
      signupPlayer: convertedTeamData.signupPlayer,
      date: new Date(dbTeamData.date_time),
    };
  }

  static convertToPlayers(dbTeamData: ScrimSignupsWithPlayers): {
    signupPlayer: Player;
    players: Player[];
  } {
    return {
      signupPlayer: {
        id: dbTeamData.signup_player_id,
        displayName: dbTeamData.signup_player_display_name,
        discordId: dbTeamData.signup_player_discord_id,
        overstatId: undefined,
        elo: undefined,
      },
      players: [
        {
          id: dbTeamData.player_one_id,
          displayName: dbTeamData.player_one_display_name,
          discordId: dbTeamData.player_one_discord_id,
          overstatId: dbTeamData.player_one_overstat_id,
          elo: dbTeamData.player_one_elo,
        },
        {
          id: dbTeamData.player_two_id,
          displayName: dbTeamData.player_two_display_name,
          discordId: dbTeamData.player_two_discord_id,
          overstatId: dbTeamData.player_two_overstat_id,
          elo: dbTeamData.player_two_elo,
        },
        {
          id: dbTeamData.player_three_id,
          displayName: dbTeamData.player_three_display_name,
          discordId: dbTeamData.player_three_discord_id,
          overstatId: dbTeamData.player_three_overstat_id,
          elo: dbTeamData.player_three_elo,
        },
      ],
    };
  }

  private async updateScrimSignupCount(scrim: Scrim) {
    const count = this.cache.getSignups(scrim.id)?.length ?? 0;
    try {
      await this.discordService.updateSignupPostDescription(scrim, count);
    } catch (e) {
      console.error(
        "Unable to update scrim signup count for ",
        scrim.id,
        scrim.discordChannel,
        e,
      );
    }
  }
}
