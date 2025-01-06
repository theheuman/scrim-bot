export class StaticValueServiceMock {
  async getInstructionText(): Promise<string | undefined> {
    return "Scrim date: ${scrimTime}\nDraft time: ${draftTime}\nLobby post time: ${lobbyPostTime}\nLow prio time: ${lowPrioTime}\nscrim signup instruction text";
  }
}
