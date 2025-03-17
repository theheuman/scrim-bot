import { DB } from "../db/db";
import { DbTable } from "../db/types";

export class StaticValueService {
  private instructionText: string | undefined;
  private scrimPassRoleId: string | undefined;

  constructor(private db: DB) {}

  async getInstructionText(): Promise<string | undefined> {
    if (this.instructionText) {
      return this.instructionText;
    }
    this.instructionText = await this.fetchValue("signups_instruction_text");
    return this.instructionText;
  }

  async getScrimPassRoleId(): Promise<string | undefined> {
    if (this.scrimPassRoleId) {
      return this.scrimPassRoleId;
    }
    this.scrimPassRoleId = await this.fetchValue("scrim_pass_role_id");
    return this.scrimPassRoleId;
  }

  private async fetchValue(key: string): Promise<string | undefined> {
    const dbResult = await this.db.get(
      DbTable.staticKeyValues,
      {
        fieldName: "name",
        value: key,
        comparator: "eq",
      },
      ["value"],
    );
    return dbResult[0]?.value as string;
  }
}
