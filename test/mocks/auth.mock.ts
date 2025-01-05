import { GuildMember } from "discord.js";
import { DiscordRole } from "../../src/models/Role";

export class AuthMock {
  constructor() {}

  async memberIsAdmin(member: GuildMember): Promise<boolean> {
    console.debug("Checking if member is admin in auth mock", member);
    return Promise.resolve(false);
  }

  async addAdminRoles(roles: DiscordRole[]): Promise<string[]> {
    console.debug("Adding admin role in auth mock", roles);
    return Promise.resolve([]);
  }

  async removeAdminRoles(roleIds: string[]): Promise<string[]> {
    console.debug("Removing admin role in auth mock", roleIds);
    return Promise.resolve([]);
  }
}
