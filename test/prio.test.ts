import { User } from "discord.js";
import { Player } from "../src/models/Player";
import { PrioService } from "../src/services/prio";
import { DbMock } from "./mocks/db.mock";
import { CacheService } from "../src/services/cache";
import { AuthService } from "../src/services/auth";
import SpyInstance = jest.SpyInstance;

describe("Prio", () => {
  let prioService: PrioService;
  const overstatLink =
    "https://overstat.gg/tournament/thevoidesports/9994.The_Void_Scrim_Lobby_1_8pm_11_/standings/overall/scoreboard";
  let getPlayerSpy: SpyInstance<Player | undefined, [userId: string], any>;
  let authCheckSpy: SpyInstance<Promise<boolean>, [user: User], any>;
  let dbMock: DbMock;
  const player: Player = { discordId: "", displayName: "", id: "" };
  const unauthorizedUser: User = {
    id: "unauthorized",
  } as User;
  const authorizedUser: User = {
    id: "authorized",
  } as User;
  const prioUser: User = {
    id: "player",
  } as User;

  beforeEach(() => {
    dbMock = new DbMock();
    const cacheMock = new CacheService();
    const authServiceMock = new AuthService(dbMock, cacheMock);
    authCheckSpy = jest.spyOn(authServiceMock, "userIsAdmin");
    authCheckSpy.mockImplementation((user) => {
      return Promise.resolve(user.id === authorizedUser.id);
    });
    getPlayerSpy = jest.spyOn(cacheMock, "getPlayer");
    getPlayerSpy.mockReturnValue(player);
    prioService = new PrioService(dbMock, cacheMock, authServiceMock);
  });

  describe("setPrio()", () => {
    const startDate = new Date();
    const endDate = new Date();
    const amount = 1;
    const reason = "inting on peoples foreheads";

    it("Should set prio", async () => {});

    it("Should throw error if user not authorized", async () => {
      const causeException = async () => {
        await prioService.setPrio(
          unauthorizedUser,
          prioUser,
          startDate,
          endDate,
          amount,
          reason,
        );
      };
      authCheckSpy.mockReturnValue(Promise.resolve(false));
      await expect(causeException).rejects.toThrow("User not authorized");
    });
  });
});
