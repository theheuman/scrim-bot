import { GuildMember, User } from "discord.js";
import { Player, PlayerInsert } from "../models/Player";
import { DB } from "../db/db";
import { ScrimSignupsWithPlayers } from "../db/table.interfaces";
import { PrioType, Scrim, ScrimSignup } from "../models/Scrims";
import { PrioService } from "./prio";
import { appConfig } from "../config";
import { AuthService } from "./auth";
import { DiscordService } from "./discord";
import { BanService } from "./ban";
import { ScrimService } from "./scrim-service";
import { LeagueService } from "./league";

function getLeagueTier(
  players: Player[],
  rosterMap: Map<string, string>,
): number {
  const teamCounts = new Map<string, number>();
  for (const player of players) {
    const teamName = rosterMap.get(player.discordId);
    if (teamName) {
      teamCounts.set(teamName, (teamCounts.get(teamName) ?? 0) + 1);
    }
  }

  const maxSameTeam =
    teamCounts.size > 0 ? Math.max(...teamCounts.values()) : 0;

  if (maxSameTeam === 3) return 1;
  if (maxSameTeam === 2) {
    const dominantTeam = [...teamCounts.entries()].find(
      ([, count]) => count === 2,
    )![0];
    const thirdPlayerInLeague = players.some((p) => {
      const team = rosterMap.get(p.discordId);
      return team !== undefined && team !== dominantTeam;
    });
    return thirdPlayerInLeague ? 2 : 3;
  }
  return 4;
}

export class SignupService {
  constructor(
    private db: DB,
    private prioService: PrioService,
    private authService: AuthService,
    private discordService: DiscordService,
    private banService: BanService,
    private scrimService: ScrimService,
    private leagueService: LeagueService,
  ) {}

  async addTeam(
    discordChannelID: string,
    teamName: string,
    commandUser: GuildMember,
    players: User[],
  ): Promise<ScrimSignup> {
    const scrim = await this.scrimService.getScrim(discordChannelID);
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

    const { mainList, waitList } = await this.getSignups(discordChannelID);
    const scrimSignups = [...mainList, ...waitList];
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
    await this.checkForBans(scrim, insertedPlayers.slice(1));
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

  private async checkForBans(scrim: Scrim, players: Player[]) {
    const ban = await this.banService.teamHasBan(scrim, players);
    if (ban.hasBan) {
      throw Error(`One or more players are scrim banned. ${ban.reason}`);
    }
  }

  async getSignups(
    discordChannelID: string,
    discordIdsWithScrimPass?: string[],
  ): Promise<{ mainList: ScrimSignup[]; waitList: ScrimSignup[] }> {
    const scrim = await this.scrimService.getScrim(discordChannelID);
    if (!scrim) {
      throw Error("No scrim found for that channel");
    }
    const teams = await this.getRawSignups(scrim);
    // this adds prio to the teams
    await this.prioService.getTeamPrioForScrim(
      scrim,
      teams,
      discordIdsWithScrimPass ?? [],
    );
    return this.sortTeams(teams, scrim.prioType);
  }

  private async sortTeams(
    teams: ScrimSignup[],
    prioType: PrioType,
  ): Promise<{
    mainList: ScrimSignup[];
    waitList: ScrimSignup[];
  }> {
    const lobbySize = appConfig.lobbySize;
    const waitlistCutoff =
      lobbySize * Math.floor(teams.length / lobbySize) || lobbySize;
    let rosterMap: Map<string, string> | undefined;
    if (prioType === PrioType.league) {
      rosterMap = await this.leagueService.getRosterDiscordIds();
    }
    const sortedTeams = [...teams].sort((teamA, teamB) => {
      if (prioType === PrioType.regular) {
        const lowPrioResult =
          (teamB.prio?.amount ?? 0) - (teamA.prio?.amount ?? 0);
        if (lowPrioResult !== 0) {
          return lowPrioResult;
        }
      } else if (prioType === PrioType.league && rosterMap) {
        const tierResult =
          getLeagueTier(teamA.players, rosterMap) -
          getLeagueTier(teamB.players, rosterMap);
        if (tierResult !== 0) {
          return tierResult;
        }
      }
      // lower date is better, so subtract b from a
      return teamA.date.valueOf() - teamB.date.valueOf();
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

  async getRawSignups(scrim: Scrim): Promise<ScrimSignup[]> {
    const scrimData = await this.db.getScrimSignupsWithPlayers(scrim.id);
    const teams: ScrimSignup[] = [];
    for (const signupData of scrimData) {
      const teamData: ScrimSignup =
        SignupService.convertDbToScrimSignup(signupData);
      teams.push(teamData);
    }
    return teams;
  }

  private async updateScrimSignupCount(scrim: Scrim) {
    const { mainList, waitList } = await this.getSignups(scrim.discordChannel);
    const count = mainList.length + waitList.length;
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
