import { DB } from "../db/db";
import { DbTable } from "../db/types";

export class StaticValueService {
  private instructionText: string | undefined;

  constructor(private db: DB) {}

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
