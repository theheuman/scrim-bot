import { DB } from "../db/db";
import { GuildMember } from "discord.js";
import { CacheService } from "./cache";

export class AuthService {
  constructor(
    private db: DB,
    private cache: CacheService,
  ) {}

  async userIsAdmin(member: GuildMember): Promise<boolean> {
    const memberRoleIds = member.roles.cache.map((role) => role.id);
    const adminRoleSet = await this.getAdminRoleSet();
    return this.hasAdminRole(memberRoleIds, adminRoleSet);
  }

  private async getAdminRoleSet() {
    let adminRoleSet = this.cache.getAdminRoles();
    if (!adminRoleSet) {
      const adminRolesArray = await this.db.getAdminRoles();
      adminRoleSet = this.cache.setAdminRoles(adminRolesArray);
    }
    return adminRoleSet;
  }

  private hasAdminRole(memberRoleIds: string[], adminRoleSet: Set<string>) {
    return memberRoleIds.some((item) => adminRoleSet.has(item));
  }
}
