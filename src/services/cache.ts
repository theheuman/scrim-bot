import { Scrim, ScrimSignup } from "../models/Scrims";
import { Player } from "../models/Player";
import { DiscordRole } from "../models/Role";

export class CacheService {
  // maps discord channels to scrim ids
  private scrimChannelMap: Map<string, Scrim>;

  // maps scrim id to a list of scrim signups
  private activeScrimSignups: Map<string, ScrimSignup[]>;

  // maps discord user id to player
  private playerMap: Map<string, Player>;

  // maps role id, to DiscordRole
  private adminRolesMap: Map<string, DiscordRole> | undefined;

  constructor() {
    this.scrimChannelMap = new Map();
    this.activeScrimSignups = new Map();
    this.playerMap = new Map();
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

  getPlayer(userId: string): Player | undefined {
    return this.playerMap.get(userId);
  }

  setPlayer(userId: string, player: Player) {
    this.playerMap.set(userId, player);
  }

  getAdminRolesMap(): Map<string, DiscordRole> | undefined {
    return this.adminRolesMap;
  }

  setAdminRolesMap(roles: DiscordRole[]): Map<string, DiscordRole> {
    this.adminRolesMap = new Map(
      roles.map((role) => [role.discordRoleId, role]),
    );
    return this.adminRolesMap;
  }

  addAdminRoles(roles: DiscordRole[]) {
    if (!this.adminRolesMap) {
      this.setAdminRolesMap(roles);
    } else {
      for (const role of roles) {
        this.adminRolesMap.set(role.discordRoleId, {
          discordRoleId: role.discordRoleId,
          roleName: role.roleName,
        });
      }
    }
  }

  removeAdminRoles(roleIds: string[]) {
    for (const roleId of roleIds) {
      this.adminRolesMap?.delete(roleId);
    }
  }

  clear() {
    this.scrimChannelMap.clear();
    this.activeScrimSignups.clear();
    this.playerMap.clear();
  }
}
