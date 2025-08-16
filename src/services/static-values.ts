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

  async getScrimInfoTimes(scrimDate: Date): Promise<{
    lobbyPostDate: Date;
    lowPrioDate: Date;
    draftDate: Date;
    rosterLockDate: Date;
  }> {
    const lobbyPostDate = new Date(scrimDate.valueOf());
    // 2 hours before
    lobbyPostDate.setTime(lobbyPostDate.valueOf() - 2 * 60 * 60 * 1000);

    const lowPrioDate = new Date(scrimDate.valueOf());
    // 1.5 hours before
    lowPrioDate.setTime(lowPrioDate.valueOf() - 1.5 * 60 * 60 * 1000);

    const draftDate = new Date(scrimDate.valueOf());
    // 30 minutes before
    draftDate.setTime(draftDate.valueOf() - 30 * 60 * 1000);

    return {
      lobbyPostDate,
      lowPrioDate,
      draftDate,
      rosterLockDate: lobbyPostDate,
    };
  }
}
