import { ScrimSignup } from "./signups";

export class Cache {
  // maps discord channels to scrim ids
  private scrimChannelMap: Map<string, string>;

  // maps scrim id to a list of scrim signups
  private activeScrimSignups: Map<string, ScrimSignup[]>;

  constructor() {
    this.scrimChannelMap = new Map();
    this.activeScrimSignups = new Map();
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

  createScrim(discordChannel: string, scrimId: string) {
    this.scrimChannelMap.set(discordChannel, scrimId);
    this.activeScrimSignups.set(scrimId, []);
  }

  removeScrimChannel(discordChannel: string) {
    this.scrimChannelMap.delete(discordChannel);
  }

  getSignups(scrimId: string) {
    return this.activeScrimSignups.get(scrimId);
  }
  setSignups(scrimId: string, teams: ScrimSignup[]) {
    this.activeScrimSignups.set(scrimId, teams);
  }

  clear() {
    this.scrimChannelMap.clear();
    this.activeScrimSignups.clear();
  }
}

export const cache = new Cache();
