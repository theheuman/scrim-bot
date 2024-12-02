import { DB, DbValue, JSONValue } from "../../src/db/db";
import { PlayerInsert } from "../../src/models/Player";
import { Scrims, ScrimSignupsWithPlayers } from "../../src/db/table.interfaces";

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
    fieldsToSearch: Record<string, string>,
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
      scrims: [
        {
          id: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
          discord_channel: "something",
          date_time_field: "2024-10-14T20:10:35.706+00:00",
        },
      ],
    });
  }

  override async getScrimSignupsWithPlayers(
    scrimId: string,
  ): Promise<ScrimSignupsWithPlayers[]> {
    return Promise.resolve([]);
  }

  delete(
    tableName: string,
    fieldsToEqual: Record<string, DbValue>,
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
    fieldsToEquate: Record<string, DbValue>,
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
    playerId: string,
    startDate: Date,
    endDate: Date,
    amount: number,
    reason: string,
  ) {
    return Promise.resolve("0");
  }
}
