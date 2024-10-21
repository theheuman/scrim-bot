export class Cache {
  // maps discord channels to scrim ids
  private scrimChannelMap: Map<string, string>;

  constructor() {
    this.scrimChannelMap = new Map();
  }

  getScrimId(discordChannel: string) {
    const result = this.scrimChannelMap.get(discordChannel);
    console.log(
      "Getting scrim id for discord channel",
      this.scrimChannelMap,
      discordChannel,
      result,
    );
    return result;
  }

  addScrimChannel(discordChannel: string, scrimId: string) {
    this.scrimChannelMap.set(discordChannel, scrimId);
  }

  removeScrimChannel(discordChannel: string) {
    this.scrimChannelMap.delete(discordChannel);
  }

  clear() {
    this.scrimChannelMap.clear();
  }
}

export const cache = new Cache();
