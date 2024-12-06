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

  private async getAdminRoleSet(): Promise<Map<string, DiscordRole>> {
    let adminRoleSet = this.cache.getAdminRoles();
    if (!adminRoleSet) {
      const adminRolesArray = await this.db.getAdminRoles();
      adminRoleSet = this.cache.setAdminRoles(adminRolesArray);
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
