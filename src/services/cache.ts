import { Scrim, ScrimSignup } from "../models/Scrims";

export class Cache {
  // maps discord channels to scrim ids
  private scrimChannelMap: Map<string, Scrim>;

  // maps scrim id to a list of scrim signups
  private activeScrimSignups: Map<string, ScrimSignup[]>;

  constructor() {
    this.scrimChannelMap = new Map();
    this.activeScrimSignups = new Map();
  }

  getScrim(discordChannel: string): Scrim | undefined {
    return this.scrimChannelMap.get(discordChannel);
  }

  createScrim(discordChannel: string, scrim: Scrim) {
    this.scrimChannelMap.set(discordChannel, scrim);
    this.activeScrimSignups.set(scrim.id, []);
  }

  removeScrimChannel(discordChannel: string) {
    const scrim = this.scrimChannelMap.get(discordChannel);
    if (scrim) {
      this.activeScrimSignups.delete(scrim.id);
    }
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
