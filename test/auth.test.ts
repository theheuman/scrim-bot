import { OverstatService } from "../src/services/overstat";
import { mockOverstatResponse } from "./mocks/overstat-response.mock";
import { GuildMember, User } from "discord.js";
import { Player, PlayerStatInsert } from "../src/models/Player";
import { ScrimSignup } from "../src/models/Scrims";
import { OverstatTournamentResponse } from "../src/models/overstatModels";
import { AuthService } from "../src/services/auth";
import { DbMock } from "./mocks/db.mock";
import { CacheService } from "../src/services/cache";

describe("Auth", () => {
  let service: AuthService;
  let cacheService: CacheService;

  beforeEach(() => {
    const dbMock = new DbMock();
    cacheService = new CacheService();
    service = new AuthService(dbMock, cacheService);
    jest.spyOn(dbMock, "getAdminRoles").mockReturnValue(Promise.resolve([]));
    jest
      .spyOn(dbMock, "addAdminRoles")
      .mockReturnValue(Promise.resolve(["db id"]));
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
        { discordRoleId: "admin role", roleName: "Void Admin" },
      ]);
      const isAdmin = await service.memberIsAdmin(member);
      expect(isAdmin).toEqual(false);
    });

    it("Should return true when member has admin role", async () => {
      // @ts-expect-error cache is read only, in our test case it is not read only
      member.roles.cache.push({ id: "admin role" });
      cacheService.setAdminRolesMap([]);
      await service.addAdminRoles([
        { discordRoleId: "admin role", roleName: "Void Admin" },
      ]);
      const isAdmin = await service.memberIsAdmin(member);
      expect(isAdmin).toEqual(true);
    });
  });
});
