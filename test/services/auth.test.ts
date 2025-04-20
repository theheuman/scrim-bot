import { GuildMember } from "discord.js";
import { AuthService } from "../../src/services/auth";
import { DbMock } from "../mocks/db.mock";
import { CacheService } from "../../src/services/cache";

describe("Auth", () => {
  let service: AuthService;
  let cacheService: CacheService;
  let dbMock: DbMock;

  beforeEach(() => {
    dbMock = new DbMock();
    cacheService = new CacheService();
    service = new AuthService(dbMock, cacheService);
    jest.spyOn(dbMock, "getAdminRoles").mockReturnValue(Promise.resolve([]));
  });

  describe("memberIsAdmin", () => {
    const member: GuildMember = {
      roles: {
        cache: [{ id: "non admin role" }],
      },
    } as unknown as GuildMember;

    it("Should return false when there are no admin roles", async () => {
      const isAdmin = await service.memberIsAdmin(member);
      expect(isAdmin).toEqual(false);
    });

    it("Should return false when member has no role", async () => {
      // @ts-expect-error cache is read only, in our test case it is not read only
      member.roles.cache = [];
      const isAdmin = await service.memberIsAdmin(member);
      expect(isAdmin).toEqual(false);
    });

    it("Should return false when member does not have admin role", async () => {
      cacheService.setAdminRolesMap([
        { discordRoleId: "admin role", roleName: "VESA Admin" },
      ]);
      const isAdmin = await service.memberIsAdmin(member);
      expect(isAdmin).toEqual(false);
    });

    it("Should return true when member has admin role", async () => {
      const dbAddSpy = jest
        .spyOn(dbMock, "addAdminRoles")
        .mockReturnValue(Promise.resolve(["db id"]));
      // @ts-expect-error cache is read only, in our test case it is not read only
      member.roles.cache.push({ id: "admin role" });
      cacheService.setAdminRolesMap([]);
      await service.addAdminRoles([
        { discordRoleId: "admin role", roleName: "VESA Admin" },
      ]);
      const isAdmin = await service.memberIsAdmin(member);
      expect(dbAddSpy).toHaveBeenCalledWith([
        {
          discordRoleId: "admin role",
          roleName: "VESA Admin",
        },
      ]);
      expect(isAdmin).toEqual(true);
    });
  });

  it("Should remove admin roles", async () => {
    const dbRemoveSpy = jest
      .spyOn(dbMock, "removeAdminRoles")
      .mockReturnValue(Promise.resolve(["db id"]));
    cacheService.setAdminRolesMap([
      { discordRoleId: "admin role", roleName: "VESA Admin" },
    ]);
    const dbIds = await service.removeAdminRoles(["admin role"]);
    expect(dbRemoveSpy).toHaveBeenCalledWith(["admin role"]);
    expect(dbIds).toEqual(["db id"]);
    expect(cacheService.getAdminRolesMap()?.get("admin role")).toEqual(
      undefined,
    );
  });
});
