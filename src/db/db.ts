import { PlayerInsert, PlayerStatInsert } from "../models/Player";
import { ScrimSignupsWithPlayers } from "./table.interfaces";

export type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

export type DbValue = string | number | boolean | Date | null;

export abstract class DB {
  abstract get(
    tableName: string,
    fieldsToSearch: Record<string, DbValue>,
    fieldsToReturn: string[],
  ): Promise<JSONValue>;
  abstract update(
    tableName: string,
    fieldsToEquate: Record<string, DbValue>,
    fieldsToUpdate: Record<string, DbValue>,
    fieldsToReturn: string[],
  ): Promise<JSONValue>;
  // returns id of new object as a string
  abstract post(
    tableName: string,
    data: Record<string, DbValue>[],
  ): Promise<string[]>;
  // returns id of the deleted object as a string
  abstract deleteById(tableName: string, id: string): Promise<string>;
  abstract delete(
    tableName: string,
    fieldsToEqual: Record<string, DbValue>,
  ): Promise<string[]>;
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
    const ids = await this.post("scrims", [
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
    const updatedScrimInfo: { id: string } = (await this.update(
      "scrims",
      { id: scrimId },
      { skill, overstat_link: overstatLink },
      ["id"],
    )) as { id: string };
    if (!updatedScrimInfo?.id) {
      throw Error(
        "Could not set skill level or overstat link on scrim, no updates made",
      );
    }
    return this.post(
      "scrim_player_stats",
      playerStats as unknown as Record<string, DbValue>[],
    );
  }

  async closeScrim(scrimId: string): Promise<string[]> {
    const updatedScrimInfo: { id: string } = (await this.update(
      "scrims",
      { id: scrimId },
      { active: false },
      ["id"],
    )) as { id: string };
    if (!updatedScrimInfo?.id) {
      throw Error("Could not set scrim to inactive, no updates made");
    }
    return this.delete("scrim_signups", {
      scrim_id: updatedScrimInfo.id,
    });
  }

  async addScrimSignup(
    teamName: string,
    scrimId: string,
    userId: string,
    playerId: string,
    playerTwoId: string,
    playerThreeId: string,
    combinedElo: number | null = null,
  ): Promise<string> {
    const ids = await this.post("scrim_signups", [
      {
        team_name: teamName,
        scrim_id: scrimId,
        signup_player_id: playerId,
        player_one_id: playerId,
        player_two_id: playerTwoId,
        player_three_id: playerThreeId,
        combined_elo: combinedElo,
      },
    ]);
    return ids[0];
  }

  removeScrimSignup(teamName: string, scrimId: string) {
    return this.delete("scrim_signups", {
      scrim_id: scrimId,
      team_name: teamName,
    });
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
    const playerUpdates = players
      .map((player, index) =>
        this.generatePlayerUpdateQuery(player, (index + 1).toString()),
      )
      .join("\n\n");
    const playerInsert = `
      insert_players(objects: [
        ${players.map((player) => `{discord_id: "${player.discordId}", display_name: "${player.displayName}"}`).join("\n")}
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
    const returnedData: { insert_players: { returning: { id: string }[] } } =
      result as { insert_players: { returning: { id: string }[] } };
    return returnedData.insert_players.returning.map((entry) => entry.id);
  }

  getActiveScrims(): Promise<{
    scrims: { discord_channel: string; id: string; date_time_field: string }[];
  }> {
    return this.get("scrims", { active: true }, [
      "discord_channel",
      "id",
      "date_time_field",
    ]) as Promise<{
      scrims: {
        discord_channel: string;
        id: string;
        date_time_field: string;
      }[];
    }>;
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
      "scrim_signups",
      {
        scrim_id: scrimId,
        team_name: oldTeamName,
      },
      { team_name: newTeamName },
      [
        "team_name",
        "player_one_id",
        "player_two_id",
        "player_three_id",
        "scrim_id",
      ],
    );
  }

  async setPrio(
    playerId: string,
    startDate: Date,
    endDate: Date,
    amount: number,
    reason: string,
  ): Promise<string> {
    const ids = await this.post("prio", [
      {
        player_id: playerId,
        start_date: startDate,
        end_date: endDate,
        amount,
        reason,
      },
    ]);
    return ids[0];
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
