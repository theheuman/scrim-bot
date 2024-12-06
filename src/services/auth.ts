import { DB } from "../db/db";
import { GuildMember } from "discord.js";
import { CacheService } from "./cache";
import { DiscordRole } from "../models/Role";

export class AuthService {
  constructor(
    private db: DB,
    private cache: CacheService,
  ) {}

  async memberIsAdmin(member: GuildMember): Promise<boolean> {
    const memberRoleIds = member.roles.cache.map((role) => role.id);
    const adminRoleSet = await this.getAdminRoleSet();
    return this.hasAdminRole(memberRoleIds, adminRoleSet);
  }

  async addAdminRoles(roles: DiscordRole[]): Promise<string[]> {
    const dbIds = await this.db.addAdminRoles(roles);
    this.cache.addAdminRoles(roles);
    return dbIds;
  }

  private async getAdminRoleSet(): Promise<Map<string, DiscordRole>> {
    let adminRoleSet = this.cache.getAdminRolesMap();
    if (!adminRoleSet) {
      const adminRolesArray = await this.db.getAdminRoles();
      adminRoleSet = this.cache.setAdminRolesMap(adminRolesArray);
    }
    return adminRoleSet;
  }

  private hasAdminRole(
    memberRoleIds: string[],
    adminRoleMao: Map<string, DiscordRole>,
  ) {
    return memberRoleIds.some((item) => adminRoleMao.has(item));
  }
}
