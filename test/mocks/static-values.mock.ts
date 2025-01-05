import { Snowflake } from "discord.js";

export class StaticValueServiceMock {
  async getSignupsChannelId(): Promise<Snowflake | undefined> {
    return "discord forum id";
  }

  async getInstructionText(): Promise<string | undefined> {
    return "Scrim date: ${scrimTime}\nDraft time: ${draftTime}\nLobby post time: ${lobbyPostTime}\nLow prio time: ${lowPrioTime}\nscrim signup instruction text";
  }
}
