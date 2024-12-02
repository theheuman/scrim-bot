import { User } from "discord.js";
import { Player } from "../src/models/Player";
import { PrioService } from "../src/services/prio";
import { DbMock } from "./mocks/db.mock";
import { CacheService } from "../src/services/cache";
import { AuthService } from "../src/services/auth";
import SpyInstance = jest.SpyInstance;

describe("Prio", () => {
  let prioService: PrioService;
  let getPlayerSpy: SpyInstance<Player | undefined, [userId: string], string>;
  let authCheckSpy: SpyInstance<Promise<boolean>, [user: User], string>;
  let dbMock: DbMock;
  const player: Player = {
    discordId: "discordId",
    displayName: "mockPlayer",
    id: "dbId",
  };
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

    describe("correctly set prio", () => {
      let insertSpy: SpyInstance;
      let dbSetPrioSpy: SpyInstance;

      beforeEach(() => {
        insertSpy = jest.spyOn(dbMock, "insertPlayerIfNotExists");
        dbSetPrioSpy = jest.spyOn(dbMock, "setPrio");
        insertSpy.mockClear();
        dbSetPrioSpy.mockClear();
      });

      it("should set prio for players in cache", async () => {
        await prioService.setPrio(
          authorizedUser,
          prioUser,
          startDate,
          endDate,
          amount,
          reason,
        );
        expect(insertSpy).toHaveBeenCalledTimes(0);
        expect(dbSetPrioSpy).toHaveBeenCalledWith(
          player.id,
          startDate,
          endDate,
          amount,
          reason,
        );
      });

      it("should set prio for players NOT in cache", async () => {
        getPlayerSpy.mockReturnValue(undefined);
        insertSpy.mockReturnValue(Promise.resolve("a different db id"));
        await prioService.setPrio(
          authorizedUser,
          prioUser,
          startDate,
          endDate,
          amount,
          reason,
        );
        expect(dbSetPrioSpy).toHaveBeenCalledWith(
          "a different db id",
          startDate,
          endDate,
          amount,
          reason,
        );
      });
    });

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
