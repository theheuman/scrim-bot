import { DB } from "../db/db";
import { DbTable, DbValue } from "../db/types";

export class StaticValueService {
  private instructionText: string | undefined;
  private scrimPassRoleId: string | undefined;

  constructor(private db: DB) {}

  async getInstructionText(): Promise<string | undefined> {
    if (this.instructionText) {
      return this.instructionText;
    }
    this.instructionText = await this.fetchStaticValue(
      "signups_instruction_text",
    );
    return this.instructionText;
  }

  async getScrimPassRoleId(): Promise<string | undefined> {
    if (this.scrimPassRoleId) {
      return this.scrimPassRoleId;
    }
    this.scrimPassRoleId = await this.fetchStaticValue("scrim_pass_role_id");
    return this.scrimPassRoleId;
  }

  private async fetchStaticValue(key: string): Promise<string | undefined> {
    const dbResult: { value: DbValue }[] = await this.db.get(
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

  // TODO test if this correctly sets times if scrim is 1 am and dates need to be day before
  async getScrimInfoTimes(scrimDate: Date): Promise<{
    lobbyPostDate: Date;
    lowPrioDate: Date;
    draftDate: Date;
    rosterLockDate: Date;
  }> {
    const lobbyMinutesBefore = await this.fetchLobbyMinutesBefore();

    const lobbyPostDate = this.getOffsetDate(
      scrimDate,
      lobbyMinutesBefore.lobbyPost,
      120,
    );

    const lowPrioDate = this.getOffsetDate(
      scrimDate,
      lobbyMinutesBefore.lowPrio,
      90,
    );

    const draftDate = this.getOffsetDate(
      scrimDate,
      lobbyMinutesBefore.draft,
      30,
    );

    const rosterLockDate = this.getOffsetDate(
      scrimDate,
      lobbyMinutesBefore.rosterLock,
      120,
    );

    return {
      lobbyPostDate,
      lowPrioDate,
      draftDate,
      rosterLockDate,
    };
  }

  private getOffsetDate(
    scrimDate: Date,
    lobbyMinutesBefore: number | undefined,
    defaultMinutesBefore: number,
  ) {
    const minutesBefore = lobbyMinutesBefore ?? defaultMinutesBefore;
    const newDate = new Date(scrimDate.valueOf());
    newDate.setTime(newDate.valueOf() - minutesBefore * 60 * 1000);
    return newDate;
  }

  private async fetchLobbyMinutesBefore(): Promise<LobbyMinutesBeforeReturnType> {
    const dbResult: { name: DbValue; minutes_before: DbValue }[] =
      await this.db.get(DbTable.lobbyEventTimes, undefined, [
        "name",
        "minutes_before",
      ]);
    const lobbyTimes: LobbyMinutesBeforeReturnType = {
      draft: undefined,
      lowPrio: undefined,
      lobbyPost: undefined,
      rosterLock: undefined,
    };
    for (const event of dbResult) {
      switch (event.name) {
        case "draft_time":
          lobbyTimes.draft = event.minutes_before as number;
          break;
        case "low_prio_time":
          lobbyTimes.lowPrio = event.minutes_before as number;
          break;
        case "roster_lock_time":
          lobbyTimes.rosterLock = event.minutes_before as number;
          break;
        case "lobby_post_time":
          lobbyTimes.lobbyPost = event.minutes_before as number;
          break;
      }
    }
    return lobbyTimes;
  }
}

type LobbyMinutesBeforeReturnType = {
  draft: number | undefined;
  lowPrio: number | undefined;
  lobbyPost: number | undefined;
  rosterLock: number | undefined;
};
