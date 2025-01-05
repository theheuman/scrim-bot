import { DB } from "./db";
import {
  DbValue,
  isCompoundExpression,
  isExpression,
  JSONValue,
  LogicalExpression,
} from "./types";
import { ErrorPayload, NhostClient } from "@nhost/nhost-js";
import { GraphQLError } from "graphql/error";
import { ExpungedPlayerPrio } from "../models/Prio";
import { appConfig } from "../config";

class NhostDb extends DB {
  private nhostClient: NhostClient;

  constructor(adminSecret: string, region: string, subdomain: string) {
    super();
    this.nhostClient = new NhostClient({
      autoLogin: false,
      subdomain,
      region,
      adminSecret,
    });
  }

  private generateWhereClause(
    logicalExpression: LogicalExpression | undefined,
  ): string {
    if (logicalExpression === undefined) {
      return "";
    }
    const searchString = this.getCompoundExpressionString(logicalExpression);
    return `where: ${searchString}`;
  }

  // recursive to handle nested compound statements
  private getCompoundExpressionString(
    logicalExpression: LogicalExpression,
  ): string {
    if (isCompoundExpression(logicalExpression)) {
      const subExpressions = logicalExpression.expressions.map((expression) => {
        if (isExpression(expression)) {
          return `{ ${expression.fieldName}: { _${expression.comparator}: ${NhostDb.createValueString(expression.value)} } }`;
        }
        return this.getCompoundExpressionString(expression);
      });
      return `{ _${logicalExpression.operator}: [${subExpressions.join(", ")}] }`;
    } else if (isExpression(logicalExpression)) {
      return `{ ${logicalExpression.fieldName}: { _${logicalExpression.comparator}: ${NhostDb.createValueString(logicalExpression.value)} } }`;
    }
    return "";
  }

  async get<K extends string>(
    tableName: string,
    logicalExpression: LogicalExpression | undefined,
    fieldsToReturn: string[],
  ): Promise<Array<Record<K, DbValue>>> {
    let searchString = this.generateWhereClause(logicalExpression);
    if (searchString) {
      // only add parentheses if we have something to search with
      searchString = `(${searchString})`;
    }
    const query = `
      query {
        ${tableName}${searchString} {
          ${fieldsToReturn.join("\n          ")}
        }
      }
    `;
    const result: {
      data: JSONValue | null;
      error: GraphQLError[] | ErrorPayload | null;
    } = await this.nhostClient.graphql.request(query);
    if (!result.data || result.error) {
      throw Error("Graph ql error: " + result.error);
    }
    const dataArray = result.data as Record<string, Array<Record<K, DbValue>>>;
    return dataArray[tableName] as Array<Record<K, DbValue>>;
  }

  async post(
    tableName: string,
    data: Record<string, DbValue>[],
  ): Promise<string[]> {
    const insertName = "insert_" + tableName;
    const objects: string[] = [];
    for (const object of data) {
      const objectToInsert = Object.keys(object)
        .map(
          (key: string) => `${key}: ${NhostDb.createValueString(object[key])}`,
        )
        .join(", ");
      objects.push(`{ ${objectToInsert} }`);
    }
    const objectsString = `(objects: [${objects.join(", ")}])`;
    const query = `
      mutation {
        ${insertName}${objectsString} {
          returning {
            id
          }
        }
      }
    `;
    const result: {
      data: JSONValue | null;
      error: GraphQLError[] | ErrorPayload | null;
    } = await this.nhostClient.graphql.request(query);
    if (!result.data || result.error) {
      console.log(query);
      console.log(result.data);
      console.log(result.error);
      throw Error("Graph ql error: " + result.error);
    }
    const returnedData: Record<string, { returning: { id: string }[] }> =
      result.data as Record<string, { returning: { id: string }[] }>;
    return returnedData[insertName].returning.map((data) => data.id);
  }

  // TODO use delete_by_pk field here? Probably more efficient
  async deleteById(tableName: string, id: string): Promise<string> {
    const deleteName = "delete_" + tableName;
    const searchString = `(${this.generateWhereClause({ fieldName: "id", comparator: "eq", value: id })})`;
    const query = `
      mutation {
        ${deleteName}${searchString} {
          returning {
            id
          }
        }
      }
    `;
    const result: {
      data: JSONValue | null;
      error: GraphQLError[] | ErrorPayload | null;
    } = await this.nhostClient.graphql.request(query);
    if (!result.data || result.error) {
      throw Error("Graph ql error: " + result.error);
    }
    const returnedData: Record<string, { returning: { id: string }[] }> =
      result.data as Record<string, { returning: { id: string }[] }>;
    return returnedData[deleteName].returning[0].id;
  }

  async delete<K extends string>(
    tableName: string,
    logicalExpression: LogicalExpression,
    fieldsToReturn: K[],
  ): Promise<Array<Record<K, DbValue>>> {
    const deleteName = "delete_" + tableName;
    const searchString = `(${this.generateWhereClause(logicalExpression)})`;
    const query = `
      mutation {
        ${deleteName}${searchString} {
          returning {
            ${fieldsToReturn.join("\n          ")}
          }
        }
      }
    `;
    const result: {
      data: JSONValue | null;
      error: GraphQLError[] | ErrorPayload | null;
    } = await this.nhostClient.graphql.request(query);
    if (!result.data || result.error) {
      throw Error("Graph ql error: " + result.error);
    }
    const returnedData = result.data as Record<
      string,
      { returning: Array<Record<K, DbValue>> }
    >;
    return returnedData[deleteName].returning;
  }

  async update(
    tableName: string,
    fieldsToSearch: LogicalExpression,
    fieldsToUpdate: Record<string, DbValue>,
    fieldsToReturn: string[],
  ): Promise<JSONValue> {
    const updateName = "update_" + tableName;
    const searchString = this.generateWhereClause(fieldsToSearch);
    const fieldsToUpdateArray = Object.keys(fieldsToUpdate).map(
      (key) => `${key}: ${NhostDb.createValueString(fieldsToUpdate[key])}`,
    );
    const setString = `_set: { ${fieldsToUpdateArray.join(",\n")} }`;
    const query = `
      mutation {
        ${updateName}( ${searchString}, ${setString} ) {
          returning {
            ${fieldsToReturn.join("\n")}
          }
        }
      }
    `;
    const result: {
      data: JSONValue | null;
      error: GraphQLError[] | ErrorPayload | null;
    } = await this.nhostClient.graphql.request(query);
    if (!result.data || result.error) {
      throw Error("Graph ql error: " + result.error);
    }
    const returnedData: Record<string, { returning: { id: string }[] }> =
      result.data as Record<string, { returning: { id: string }[] }>;
    return returnedData[updateName].returning[0];
  }

  async changeTeamName(
    scrimId: string,
    userId: string, // the user making the change, this gets authorized by the db
    teamName: string,
    newTeamName: string,
  ): Promise<{
    team_name: string;
    signup_player_id: string;
    player_one_id: string;
    player_two_id: string;
    player_three_id: string;
    scrim_id: string;
  }> {
    const updateName = "update_scrim_signups";
    const searchString = `
        where: {
          scrim_id: { _eq: "${scrimId}" },
          team_name: { _eq: "${teamName}" },
          _or: [
            { signup_player_id: { _eq: "${userId}" } },
            { player_one_id: { _eq: "${userId}" } },
            { player_two_id: { _eq: "${userId}" } },
            { player_three_id: { _eq: "${userId}" } }
          ]
        }`;
    const fieldsToReturn = [
      "team_name",
      "signup_player_id",
      "player_one_id",
      "player_two_id",
      "player_three_id",
      "scrim_id",
    ];
    const setString = `_set: { team_name: "${newTeamName}" }`;
    const query = `
      mutation {
        ${updateName}( ${searchString}, ${setString} ) {
          returning {
            ${fieldsToReturn.join("\n")}
          }
        }
      }
    `;

    const result: {
      update_scrim_signups_one: {
        returning: {
          team_name: string;
          signup_player_id: string;
          player_one_id: string;
          player_two_id: string;
          player_three_id: string;
          scrim_id: string;
        }[];
      };
    } = (await this.customQuery(query)) as unknown as {
      update_scrim_signups_one: {
        returning: {
          team_name: string;
          signup_player_id: string;
          player_one_id: string;
          player_two_id: string;
          player_three_id: string;
          scrim_id: string;
        }[];
      };
    };
    const teamData = result.update_scrim_signups_one.returning[0];
    if (!teamData) {
      throw Error("Changes not made");
    }
    return teamData;
  }

  async replaceTeammate(
    scrimId: string,
    teamName: string,
    userId: string,
    oldPlayerId: string,
    newPlayerId: string,
  ): Promise<{
    team_name: string;
    signup_player_id: string;
    player_one_id: string;
    player_two_id: string;
    player_three_id: string;
    scrim_id: string;
  }> {
    const query = `
      mutation {
  update_scrim_signups_many(
    updates: [
      {${this.getReplaceTeammateMutationBlock("one", scrimId, userId, oldPlayerId, newPlayerId)}},
      {${this.getReplaceTeammateMutationBlock("two", scrimId, userId, oldPlayerId, newPlayerId)}},
      {${this.getReplaceTeammateMutationBlock("three", scrimId, userId, oldPlayerId, newPlayerId)}}
    ]
  ) {
    returning {
      team_name
      signup_player_id
      player_one_id
      player_two_id
      player_three_id
      scrim_id
    }
  }
}
`;
    const result: {
      update_scrim_signups_many: {
        returning: {
          team_name: string;
          signup_player_id: string;
          player_one_id: string;
          player_two_id: string;
          player_three_id: string;
          scrim_id: string;
        }[];
      }[];
    } = (await this.customQuery(query)) as unknown as {
      update_scrim_signups_many: {
        returning: {
          team_name: string;
          signup_player_id: string;
          player_one_id: string;
          player_two_id: string;
          player_three_id: string;
          scrim_id: string;
        }[];
      }[];
    };
    const teamData = result.update_scrim_signups_many.find(
      (returned) => !!returned.returning[0]?.team_name,
    );
    const returnData = teamData?.returning[0];
    if (!returnData) {
      throw Error("Changes not made");
    }
    return returnData;
  }

  // TODO smartly compartmentalize these two methods to avoid duplicated code
  async replaceTeammateNoAuth(
    scrimId: string,
    teamName: string,
    oldPlayerId: string,
    newPlayerId: string,
  ): Promise<{
    team_name: string;
    signup_player_id: string;
    player_one_id: string;
    player_two_id: string;
    player_three_id: string;
    scrim_id: string;
  }> {
    const query = `
      mutation {
  update_scrim_signups_many(
    updates: [
      {${this.getReplaceTeammateMutationBlockNoAuth("one", scrimId, oldPlayerId, newPlayerId)}},
      {${this.getReplaceTeammateMutationBlockNoAuth("two", scrimId, oldPlayerId, newPlayerId)}},
      {${this.getReplaceTeammateMutationBlockNoAuth("three", scrimId, oldPlayerId, newPlayerId)}}
    ]
  ) {
    returning {
      team_name
      signup_player_id
      player_one_id
      player_two_id
      player_three_id
      scrim_id
    }
  }
}
`;
    const result: {
      update_scrim_signups_many: {
        returning: {
          team_name: string;
          signup_player_id: string;
          player_one_id: string;
          player_two_id: string;
          player_three_id: string;
          scrim_id: string;
        }[];
      }[];
    } = (await this.customQuery(query)) as unknown as {
      update_scrim_signups_many: {
        returning: {
          team_name: string;
          signup_player_id: string;
          player_one_id: string;
          player_two_id: string;
          player_three_id: string;
          scrim_id: string;
        }[];
      }[];
    };
    const teamData = result.update_scrim_signups_many.find(
      (returned) => !!returned.returning[0]?.team_name,
    );
    const returnData = teamData?.returning[0];
    if (!returnData) {
      throw Error("Changes not made");
    }
    return returnData;
  }

  private getReplaceTeammateMutationBlock(
    playerNumber: "one" | "two" | "three",
    scrimId: string,
    userId: string,
    oldPlayerId: string,
    newPlayerId: string,
  ) {
    return `
        where: {
          scrim_id: { _eq: "${scrimId}" },
          player_${playerNumber}_id: { _eq: "${oldPlayerId}" },
          _or: [
            { signup_player_id: { _eq: "${userId}" } },
            { player_one_id: { _eq: "${userId}" } },
            { player_two_id: { _eq: "${userId}" } },
            { player_three_id: { _eq: "${userId}" } }
          ]
        },
        _set: { player_${playerNumber}_id: "${newPlayerId}" }
      `;
  }

  private getReplaceTeammateMutationBlockNoAuth(
    playerNumber: "one" | "two" | "three",
    scrimId: string,
    oldPlayerId: string,
    newPlayerId: string,
  ) {
    return `
        where: {
          scrim_id: { _eq: "${scrimId}" },
          player_${playerNumber}_id: { _eq: "${oldPlayerId}" }
        },
        _set: { player_${playerNumber}_id: "${newPlayerId}" }
      `;
  }

  async expungePrio(prioIds: string[]): Promise<ExpungedPlayerPrio[]> {
    const prioIdLogicalExpression: LogicalExpression = {
      operator: "or",
      expressions: prioIds.map((id) => ({
        fieldName: "id",
        comparator: "eq",
        value: id,
      })),
    };
    const query = `
      mutation {
        delete_prio(${this.generateWhereClause(prioIdLogicalExpression)}) {
          returning {
            player {
              discord_id
              display_name
            }
            amount
            end_date
          }
        }
      }
    `;
    const deletedEntries = (await this.customQuery(query)) as unknown as {
      delete_prio: {
        returning: {
          player: { discord_id: string; display_name: string };
          amount: number;
          end_date: string;
        }[];
      };
    };
    return deletedEntries.delete_prio.returning.map((entry) => ({
      playerDiscordId: entry.player.discord_id,
      playerDisplayName: entry.player.display_name,
      amount: entry.amount,
      endDate: new Date(entry.end_date),
    }));
  }

  async customQuery(query: string): Promise<JSONValue> {
    const result: {
      data: JSONValue | null;
      error: GraphQLError[] | ErrorPayload | null;
    } = await this.nhostClient.graphql.request(query);
    if (!result.data || result.error) {
      throw Error("Graph ql error: " + result.error);
    }
    return Promise.resolve(result.data);
  }

  private static createValueString(
    value: string | number | boolean | Date | null,
  ): string {
    if (typeof value === "string") {
      return `"${value}"`;
    } else if (value instanceof Date) {
      return `"${value.toISOString()}"`;
    } else if (value === null) {
      return `null`;
    }
    return `${value}`;
  }
}
export const nhostDb = new NhostDb(
  appConfig.nhost.adminSecret,
  appConfig.nhost.region,
  appConfig.nhost.subdomain,
);
