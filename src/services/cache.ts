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

  getScrimId(discordChannel: string): string | undefined {
    return this.scrimChannelMap.get(discordChannel);
  }

  createScrim(discordChannel: string, scrimId: string) {
    this.scrimChannelMap.set(discordChannel, scrimId);
    this.activeScrimSignups.set(scrimId, []);
  }

  removeScrimChannel(discordChannel: string) {
    this.scrimChannelMap.delete(discordChannel);
  }

  getSignups(scrimId: string): ScrimSignup[] | undefined {
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
