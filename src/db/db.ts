import { PlayerInsert, PlayerStatInsert } from "../models/Player";
import { ScrimSignupsWithPlayers } from "./table.interfaces";
import {
  Comparator,
  DbTable,
  DbValue,
  Expression,
  JSONValue,
  LogicalExpression,
} from "./types";
import { DiscordRole } from "../models/Role";
import { ExpungedPlayerPrio } from "../models/Prio";

export abstract class DB {
  abstract get<K extends string>(
    tableName: DbTable,
    logicalExpression: LogicalExpression | undefined,
    fieldsToReturn: K[],
  ): Promise<Array<Record<K, DbValue>>>;
  abstract update<K extends string>(
    tableName: DbTable,
    logicalExpression: LogicalExpression,
    fieldsToUpdate: Record<string, DbValue>,
    fieldsToReturn: K[],
  ): Promise<Array<Record<K, DbValue>>>;
  // returns id of new object as a string
  abstract post(
    tableName: DbTable,
    data: Record<string, DbValue>[],
  ): Promise<string[]>;
  // returns id of the deleted object as a string
  abstract deleteById(tableName: DbTable, id: string): Promise<string>;
  abstract delete<K extends string>(
    tableName: string,
    logicalExpression: LogicalExpression,
    fieldsToReturn: K[],
  ): Promise<Array<Record<K, DbValue>>>;

  abstract customQuery(query: string): Promise<JSONValue>;
  abstract replaceTeammate(
    scrimId: string,
    teamName: string,
    userId: string, // the user making the change, this gets authorized by the db
    oldPlayerId: string,
    newPlayerId: string,
  ): Promise<JSONValue>;
  abstract replaceTeammateNoAuth(
    scrimId: string,
    teamName: string,
    oldPlayerId: string,
    newPlayerId: string,
  ): Promise<JSONValue>;
  abstract changeTeamName(
    scrimId: string,
    userId: string, // the user making the change, this gets authorized by the db
    teamName: string,
    newTeamName: string,
  ): Promise<JSONValue>;

  async createNewScrim(
    dateTime: Date,
    discordChannelID: string,
    skill: number | null = null,
    overstatLink: string | null = null,
  ): Promise<string> {
    const ids = await this.post(DbTable.scrims, [
      {
        date_time_field: dateTime,
        skill,
        overstat_link: overstatLink,
        discord_channel: discordChannelID,
      },
    ]);
    return ids[0];
  }

  async computeScrim(
    scrimId: string,
    overstatLink: string,
    skill: number,
    playerStats: PlayerStatInsert[],
  ): Promise<string[]> {
    const updatedScrimInfo: { id: DbValue }[] = await this.update(
      DbTable.scrims,
      {
        fieldName: "id",
        comparator: "eq",
        value: scrimId,
      },
      { skill, overstat_link: overstatLink },
      ["id"],
    );
    if (!updatedScrimInfo[0].id) {
      throw Error(
        "Could not set skill level or overstat link on scrim, no updates made",
      );
    }
    return this.post(
      DbTable.scrimPlayerStats,
      playerStats as unknown as Record<string, DbValue>[],
    );
  }

  async closeScrim(discordChannelID: string): Promise<string[]> {
    const updatedScrimInfo: { id: DbValue }[] = await this.update(
      DbTable.scrims,
      {
        fieldName: "discord_channel",
        comparator: "eq" as Comparator,
        value: discordChannelID,
      },
      { active: false },
      ["id"],
    );
    if (!updatedScrimInfo[0]?.id) {
      throw Error("Could not set scrim(s) to inactive, no updates made");
    }
    const equateExpressions: Expression[] = updatedScrimInfo.map((scrim) => ({
      fieldName: "scrim_id",
      comparator: "eq" as Comparator,
      value: scrim.id,
    }));
    const deletedScrimSignups = await this.delete(
      DbTable.scrimSignups,
      {
        operator: "or",
        expressions: equateExpressions,
      },
      ["id"],
    );
    return deletedScrimSignups.map((entry) => entry.id as string);
  }

  async addScrimSignup(
    teamName: string,
    scrimId: string,
    userId: string,
    playerId: string,
    playerTwoId: string,
    playerThreeId: string,
    date: Date,
    combinedElo: number | null = null,
  ): Promise<string> {
    const ids = await this.post(DbTable.scrimSignups, [
      {
        team_name: teamName,
        scrim_id: scrimId,
        signup_player_id: userId,
        player_one_id: playerId,
        player_two_id: playerTwoId,
        player_three_id: playerThreeId,
        combined_elo: combinedElo,
        date_time: date,
      },
    ]);
    return ids[0];
  }

  async removeScrimSignup(teamName: string, scrimId: string): Promise<string> {
    const deletedEntries = await this.delete(
      DbTable.scrimSignups,
      {
        operator: "and",
        expressions: [
          {
            fieldName: "scrim_id",
            comparator: "eq",
            value: scrimId,
          },
          {
            fieldName: "team_name",
            comparator: "eq",
            value: teamName,
          },
        ],
      },
      ["id"],
    );
    return deletedEntries[0].id as string;
  }

  // returns id
  async insertPlayerIfNotExists(
    discordId: string,
    displayName: string,
    overstatLink?: string,
  ): Promise<string> {
    const overstatLinkObjectSuffix = overstatLink
      ? `, overstat_link: "${overstatLink}"`
      : "";
    const overstatLinkColumn = overstatLink
      ? `\n              overstat_link`
      : "";
    const query = `
      mutation upsertPlayer {
        insert_players_one(
          object: {discord_id: "${discordId}", display_name: "${displayName}"${overstatLinkObjectSuffix}}
          on_conflict: {
            constraint: players_discord_id_key,  # Unique constraint on discord_id
            update_columns: [
              display_name${overstatLinkColumn}
            ]
          }
        ) {
          id  # Return the ID of the player, whether newly inserted or found
        }
      }
    `;
    const result: JSONValue = await this.customQuery(query);
    const returnedData: { insert_players_one: { id: string } } = result as {
      insert_players_one: { id: string };
    };
    return returnedData.insert_players_one.id;
  }

  /* returns list of id's
   *
   * Created a special method that inserts players if they do not exist, also takes special care not to overwrite overstats and elo if they are in DB but not included in player object
   */
  async insertPlayers(players: PlayerInsert[]): Promise<string[]> {
    const playerMap: Map<string, PlayerInsert> = new Map();
    for (const player of players) {
      playerMap.set(player.discordId, player);
    }
    const nonDuplicatePlayers = [...playerMap.values()];
    const playerUpdates = nonDuplicatePlayers
      .map((player, index) =>
        this.generatePlayerUpdateQuery(player, (index + 1).toString()),
      )
      .join("\n\n");
    const playerInsert = `
      insert_players(objects: [
        ${nonDuplicatePlayers.map((player) => `{discord_id: "${player.discordId}", display_name: "${player.displayName}"}`).join("\n")}
      ]
        on_conflict: {
          constraint: players_discord_id_key,   # Unique constraint on discord_id
          update_columns: [
            display_name  # necessary for graphql to actually return an id
          ]
        }
      ) {
        returning {
          id
          discord_id
        }
      }
    `;
    const query = `
      mutation upsertPlayer {
        ${playerInsert}

        ${playerUpdates}
      }
    `;
    const result: JSONValue = await this.customQuery(query);
    const returnedData: {
      insert_players: { returning: { id: string; discord_id: string }[] };
    } = result as {
      insert_players: { returning: { id: string; discord_id: string }[] };
    };

    return players.map(
      (player) =>
        returnedData.insert_players.returning.find(
          (entry) => entry.discord_id === player.discordId,
        )?.id as string,
    );
  }

  // This feels like a really gross way to grab a single entry
  async getPlayerLink(discordId: string)
  {
    const dbData = await this.get(DbTable.players,
      { fieldName: "discord_id", 
       comparator: "eq", 
       value: discordId}, 
       ["overstat_link"]);

   return dbData[0]["overstat_link"] as string
  }

  getActiveScrims(): Promise<
    { discord_channel: string; id: string; date_time_field: string }[]
  > {
    return this.get(
      DbTable.scrims,
      { fieldName: "active", comparator: "eq", value: true },
      ["discord_channel", "id", "date_time_field"],
    ) as Promise<
      {
        discord_channel: string;
        id: string;
        date_time_field: string;
      }[]
    >;
  }

  async getScrimSignupsWithPlayers(
    scrimId: string,
  ): Promise<ScrimSignupsWithPlayers[]> {
    const query = `
      query GetScrimSignupsWithPlayers {
        get_scrim_signups_with_players(args: { scrim_id_search: "${scrimId}" }) {
          scrim_id
          date_time
          team_name
          signup_player_id
          signup_player_discord_id
          signup_player_display_name
          player_one_id
          player_one_discord_id
          player_one_display_name
          player_one_overstat_id
          player_one_elo
          player_two_id
          player_two_discord_id
          player_two_display_name
          player_two_overstat_id
          player_two_elo
          player_three_id
          player_three_discord_id
          player_three_display_name
          player_three_overstat_id
          player_three_elo
        }
      }
    `;

    const result: JSONValue = await this.customQuery(query);
    const returnedData: {
      get_scrim_signups_with_players: ScrimSignupsWithPlayers[];
    } = result as unknown as {
      get_scrim_signups_with_players: ScrimSignupsWithPlayers[];
    };
    return returnedData.get_scrim_signups_with_players;
  }

  // to be called if user role is admin
  changeTeamNameNoAuth(
    scrimId: string,
    oldTeamName: string,
    newTeamName: string,
  ): Promise<JSONValue> {
    return this.update(
      DbTable.scrimSignups,
      {
        operator: "and",
        expressions: [
          {
            fieldName: "scrim_id",
            comparator: "eq",
            value: scrimId,
          },
          {
            fieldName: "team_name",
            comparator: "eq",
            value: oldTeamName,
          },
        ],
      },
      { team_name: newTeamName },
      [
        "team_name",
        "player_one_id",
        "player_two_id",
        "player_three_id",
        "scrim_id",
      ],
    ) as Promise<
      {
        team_name: string;
        player_one_id: string;
        player_two_id: string;
        player_three_id: string;
        scrim_id: string;
      }[]
    >;
  }

  async setPrio(
    playerIds: string[],
    startDate: Date,
    endDate: Date,
    amount: number,
    reason: string,
  ): Promise<string[]> {
    return this.post(
      DbTable.prio,
      playerIds.map((playerId) => ({
        player_id: playerId,
        start_date: startDate,
        end_date: endDate,
        amount,
        reason,
      })),
    );
  }

  abstract expungePrio(prioIds: string[]): Promise<ExpungedPlayerPrio[]>;

  async getPrio(
    date: Date,
  ): Promise<{ id: string; amount: number; reason: string }[]> {
    const dbData = await this.get(
      DbTable.prio,
      {
        operator: "and",
        expressions: [
          {
            fieldName: "start_date",
            comparator: "lte",
            value: date,
          },
          {
            fieldName: "end_date",
            comparator: "gte",
            value: date,
          },
        ],
      },
      ["player_id", "amount", "reason"],
    );
    return dbData.map(({ player_id, amount, reason }) => ({
      id: player_id as string,
      amount: amount as number,
      reason: reason as string,
    }));
  }

  async getAdminRoles(): Promise<DiscordRole[]> {
    const results = await this.get(DbTable.scrimAdminRoles, undefined, [
      "discord_role_id",
      "role_name",
    ]);
    return results.map((role) => ({
      discordRoleId: role.discord_role_id as string,
      roleName: role.role_name as string,
    }));
  }

  async addAdminRoles(roles: DiscordRole[]): Promise<string[]> {
    return this.post(
      DbTable.scrimAdminRoles,
      roles.map((role) => ({
        discord_role_id: role.discordRoleId,
        role_name: role.roleName,
      })),
    );
  }

  async removeAdminRoles(roleIds: string[]): Promise<string[]> {
    const deletedEntries = await this.delete(
      DbTable.scrimAdminRoles,
      {
        operator: "or",
        expressions: roleIds.map((roleId) => ({
          fieldName: "discord_role_id",
          comparator: "eq",
          value: roleId,
        })),
      },
      ["id"],
    );
    return deletedEntries.map((entry) => entry.id as string);
  }

  private generatePlayerUpdateQuery(
    player: PlayerInsert,
    uniqueQueryName: string,
  ) {
    const overstatSet = player.overstatId
      ? `overstat_id: "${player.overstatId}"`
      : "";
    const eloSet = player.elo ? `elo: ${player.elo}` : "";
    return `
      update_player_${uniqueQueryName}: update_players(
         where: {discord_id: {_eq: "${player.discordId}"}},
          _set: {
            display_name: "${player.displayName}",
            ${overstatSet}${overstatSet && eloSet ? "," : ""}
            ${eloSet}
          }
        ) {
          affected_rows
        }
    `;
  }
}
