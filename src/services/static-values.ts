import { DB } from "../db/db";
import { Snowflake } from "discord.js";
import { DbTable } from "../db/types";

export class StaticValueService {
  private signupsChannelId: Snowflake | undefined;
  private instructionText: string | undefined;

  constructor(private db: DB) {}

  async getSignupsChannelId(): Promise<Snowflake | undefined> {
    if (this.signupsChannelId) {
      return this.signupsChannelId;
    }
    const dbResult = await this.db.get(
      DbTable.staticKeyValues,
      {
        fieldName: "name",
        value: "signup_channel",
        comparator: "eq",
      },
      ["value"],
    );
    this.signupsChannelId = dbResult[0].value as Snowflake;
    return this.signupsChannelId;
  }

  async getInstructionText(): Promise<string | undefined> {
    if (this.instructionText) {
      return this.instructionText;
    }
    const dbResult = await this.db.get(
      DbTable.staticKeyValues,
      {
        fieldName: "name",
        value: "signups_instruction_text",
        comparator: "eq",
      },
      ["value"],
    );
    this.instructionText = dbResult[0].value as string;
    return this.instructionText;
  }
}
