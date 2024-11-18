import { User } from "discord.js";
import { Player, PlayerInsert } from "../models/Player";
import { DB } from "../db/db";
import { Scrims, ScrimSignupsWithPlayers } from "../db/table.interfaces";
import { Cache } from "./cache";
import { OverstatService } from "./overstat";
import { PlayerTournamentStats } from "../models/overstatModels";

export interface ScrimSignup {
  teamName: string;
  players: Player[];
  signupId: string;
  signupPlayer: Player;
  prio?: number;
}

export class ScrimSignups {
  constructor(
    private db: DB,
    private cache: Cache,
    private overstatService: OverstatService,
  ) {
    this.updateActiveScrims();
  }

  async updateActiveScrims(log?: boolean) {
    const activeScrims: { scrims: Partial<Scrims>[] } =
      await this.db.getActiveScrims();
    for (const scrim of activeScrims.scrims) {
      if (scrim.id && scrim.discord_channel) {
        this.cache.createScrim(scrim.discord_channel, scrim.id);
        if (log) {
          console.log("Added scrim channel", this.cache);
        }
        this.getSignups(scrim.id);
      }
    }
  }

  async createScrim(discordChannelID: string, dateTime: Date): Promise<string> {
    const scrimId = await this.db.createNewScrim(dateTime, discordChannelID, 1);
    this.cache.createScrim(discordChannelID, scrimId);
    return scrimId;
  }

  async closeScrim(
    discordChannelID: string,
    overstatLink: string,
  ): Promise<string> {
    const scrimId = this.cache.getScrimId(discordChannelID);
    if (!scrimId) {
      throw Error("No scrim found for that channel");
    }
    const signups = this.cache.getSignups(scrimId);
    if (!signups) {
      throw Error("No signups for that scrim");
    }
    const stats = await this.overstatService.getOverallStats(overstatLink);
    const playerStats: PlayerTournamentStats[] =
      this.overstatService.matchPlayers(signups, stats);
    await this.db.closeScrim(scrimId, overstatLink, 1, playerStats);
    return overstatLink;
  }

  async addTeam(
    scrimId: string,
    teamName: string,
    commandUser: User,
    players: User[],
  ): Promise<string> {
    const scrim = this.cache.getSignups(scrimId);
    if (!scrim) {
      throw Error("No active scrim with that scrim id");
    } else if (players.length !== 3) {
      throw Error("Exactly three players must be provided");
    } else if (
      players[0].id === players[1].id ||
      players[0].id === players[2].id ||
      players[1].id === players[2].id
    ) {
      throw Error("Duplicate player");
    }
    // yes this is a three deep for loop, this is a cry for help, please optimize this
    for (const team of scrim) {
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
      (discordUser: User) => ({
        discordId: discordUser.id as string,
        displayName: discordUser.displayName,
      }),
    );
    const playerIds = await this.db.insertPlayers(convertedPlayers);
    const signupId = await this.db.addScrimSignup(
      teamName,
      scrimId,
      playerIds[0],
      playerIds[1],
      playerIds[2],
      playerIds[3],
    );
    const mappedPlayers: Player[] = convertedPlayers.map((player, index) => ({
      id: playerIds[index],
      displayName: player.displayName,
      discordId: player.discordId,
      overstatLink: player.overstatId,
      elo: player.elo,
    }));
    scrim.push({
      teamName: teamName,
      players: mappedPlayers.slice(1),
      signupPlayer: mappedPlayers[0],
      signupId,
    });
    return signupId;
  }

  // TODO cacheing here?
  async getSignups(
    scrimId: string,
  ): Promise<{ mainList: ScrimSignup[]; waitList: ScrimSignup[] }> {
    const scrimData = await this.db.getScrimSignupsWithPlayers(scrimId);
    const teams: ScrimSignup[] = [];
    for (const signupData of scrimData) {
      const teamData: ScrimSignup =
        ScrimSignups.convertDbToScrimSignup(signupData);
      teams.push(teamData);
    }
    // TODO make call for all users who are low prio
    this.cache.setSignups(scrimId, teams);
    return ScrimSignups.sortTeams(teams);
  }

  getScrimId(discordChannel: string) {
    return this.cache.getScrimId(discordChannel);
  }

  static sortTeams(teams: ScrimSignup[]): {
    mainList: ScrimSignup[];
    waitList: ScrimSignup[];
  } {
    const waitlistCutoff = 20;
    teams.sort((teamA, teamB) => {
      const lowPrioAmountA = teamA.players.reduce(
        (count, player) => (player.lowPrio ? count + 1 : count),
        0,
      );
      const lowPrioAmountB = teamB.players.reduce(
        (count, player) => (player.lowPrio ? count + 1 : count),
        0,
      );
      return lowPrioAmountA - lowPrioAmountB;
    });
    return { mainList: teams.splice(0, waitlistCutoff), waitList: teams };
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
}
