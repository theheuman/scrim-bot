export class StaticValueServiceMock {
  async getInstructionText(): Promise<string | undefined> {
    return "Scrim date: ${scrimTime}\nDraft time: ${draftTime}\nLobby post time: ${lobbyPostTime}\nLow prio time: ${lowPrioTime}\nscrim signup instruction text";
  }
  async getScrimPassRoleId(): Promise<string | undefined> {
    return "3568173514";
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
