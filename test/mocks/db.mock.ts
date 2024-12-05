import { DB } from "../../src/db/db";
import { DbValue, JSONValue, LogicalExpression } from "../../src/db/types";
import { PlayerInsert } from "../../src/models/Player";
import { ScrimSignupsWithPlayers } from "../../src/db/table.interfaces";

export class DbMock extends DB {
  customQueryResponse: JSONValue;
  deleteResponse: string;
  getResponse: JSONValue;
  postResponse: string[];
  addScrimSignupResponse: string;
  insertPlayersResponse: string[];
  insertPlayerIfNotExistsResponse: string;

  constructor() {
    super();

    this.customQueryResponse = {};
    this.deleteResponse = "";
    this.getResponse = {};
    this.postResponse = [""];
    this.addScrimSignupResponse = "";
    this.insertPlayersResponse = [""];
    this.insertPlayerIfNotExistsResponse = "";
  }

  customQuery(query: string): Promise<JSONValue> {
    return Promise.resolve(this.customQueryResponse);
  }

  deleteById(tableName: string, id: string): Promise<string> {
    return Promise.resolve(this.deleteResponse);
  }

  get(
    tableName: string,
    fieldsToSearch: LogicalExpression,
    fieldsToReturn: string[],
  ): Promise<JSONValue> {
    return Promise.resolve(this.getResponse);
  }

  post(tableName: string, data: Record<string, DbValue>[]): Promise<string[]> {
    return Promise.resolve(this.postResponse);
  }

  override addScrimSignup(
    teamName: string,
    scrimId: string,
    userId: string,
    playerId: string,
    playerTwoId: string,
    playerThreeId: string,
    date: Date,
    combinedElo: number | null = null,
  ): Promise<string> {
    return Promise.resolve(this.addScrimSignupResponse);
  }

  async insertPlayerIfNotExists(
    discordId: string,
    displayName: string,
    overstatLink?: string,
  ): Promise<string> {
    return Promise.resolve(this.insertPlayerIfNotExistsResponse);
  }

  async insertPlayers(players: PlayerInsert[]): Promise<string[]> {
    return Promise.resolve(this.insertPlayersResponse);
  }

  override getActiveScrims(): Promise<{
    scrims: { discord_channel: string; id: string; date_time_field: string }[];
  }> {
    return Promise.resolve({
      scrims: [],
    });
  }

  override async getScrimSignupsWithPlayers(
    scrimId: string,
  ): Promise<ScrimSignupsWithPlayers[]> {
    return Promise.resolve([]);
  }

  delete(
    tableName: string,
    fieldsToEqual: LogicalExpression,
  ): Promise<string[]> {
    return Promise.resolve([""]);
  }

  replaceTeammate(
    scrimId: string,
    teamName: string,
    oldPlayerId: string,
    newPlayerId: string,
  ): Promise<JSONValue> {
    return Promise.resolve({});
  }

  update(
    tableName: string,
    fieldsToEquate: LogicalExpression,
    fieldsToUpdate: Record<string, DbValue>,
    fieldsToReturn: string[],
  ): Promise<JSONValue> {
    return Promise.resolve({});
  }

  changeTeamName(
    scrimId: string,
    userId: string,
    teamName: string,
    newTeamName: string,
  ): Promise<JSONValue> {
    return Promise.resolve({});
  }

  replaceTeammateNoAuth(
    scrimId: string,
    teamName: string,
    oldPlayerId: string,
    newPlayerId: string,
  ): Promise<JSONValue> {
    return Promise.resolve({});
  }

  async setPrio(
    playerIds: string[],
    startDate: Date,
    endDate: Date,
    amount: number,
    reason: string,
  ) {
    return Promise.resolve(["0"]);
  }

  async getPrio(
    date: Date,
  ): Promise<{ id: string; amount: number; reason: string }[]> {
    return Promise.resolve([
      {
        id: "0",
        amount: 0,
        reason: "lol",
      },
    ]);
  }

  async expungePrio() {
    return Promise.resolve([]);
  }
}
