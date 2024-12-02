import { User } from "discord.js";
import { Player, PlayerInsert } from "../src/models/Player";
import { PrioService } from "../src/services/prio";
import { DbMock } from "./mocks/db.mock";
import { CacheService } from "../src/services/cache";
import { AuthService } from "../src/services/auth";
import SpyInstance = jest.SpyInstance;

describe("Prio", () => {
  let prioService: PrioService;
  let getPlayerSpy: SpyInstance<Player | undefined, [userId: string], string>;
  let setPlayerSpy: SpyInstance<
    void,
    [playerId: string, player: Player],
    string
  >;
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
  const prioUserInCache: User = {
    id: "in cache",
  } as User;
  const prioUserNotCached: User = {
    id: "not in cache",
    displayName: "not in cache",
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
    getPlayerSpy.mockImplementation((id) => {
      return id === prioUserInCache.id ? player : undefined;
    });
    setPlayerSpy = jest.spyOn(cacheMock, "setPlayer");
    prioService = new PrioService(dbMock, cacheMock, authServiceMock);
  });

  describe("setPrio()", () => {
    const startDate = new Date();
    const endDate = new Date();
    const amount = 1;
    const reason = "inting on peoples foreheads";

    describe("correctly set prio", () => {
      let insertSpy: SpyInstance<
        Promise<string[]>,
        [players: PlayerInsert[]],
        string
      >;
      let dbSetPrioSpy: SpyInstance<
        Promise<string[]>,
        [
          playerIds: string[],
          startDate: Date,
          endDate: Date,
          amount: number,
          reason: string,
        ],
        string
      >;

      beforeEach(() => {
        insertSpy = jest.spyOn(dbMock, "insertPlayers");
        dbSetPrioSpy = jest.spyOn(dbMock, "setPrio");
        insertSpy.mockClear();
        dbSetPrioSpy.mockClear();
        insertSpy.mockReturnValue(Promise.resolve(["a different db id"]));
      });

      it("should set prio for players in cache", async () => {
        await prioService.setPlayerPrio(
          authorizedUser,
          [prioUserInCache],
          startDate,
          endDate,
          amount,
          reason,
        );
        expect(insertSpy).toHaveBeenCalledTimes(0);
        expect(dbSetPrioSpy).toHaveBeenCalledWith(
          [player.id],
          startDate,
          endDate,
          amount,
          reason,
        );
      });

      it("should set prio for players NOT in cache", async () => {
        setPlayerSpy.mockClear();
        await prioService.setPlayerPrio(
          authorizedUser,
          [prioUserNotCached],
          startDate,
          endDate,
          amount,
          reason,
        );
        expect(dbSetPrioSpy).toHaveBeenCalledWith(
          ["a different db id"],
          startDate,
          endDate,
          amount,
          reason,
        );
        expect(setPlayerSpy).toHaveBeenCalledWith("a different db id", {
          id: "a different db id",
          discordId: prioUserNotCached.id,
          displayName: prioUserNotCached.displayName,
        });
      });

      it("should set prio for list of players some NOT in cache", async () => {
        await prioService.setPlayerPrio(
          authorizedUser,
          [prioUserInCache, prioUserNotCached],
          startDate,
          endDate,
          amount,
          reason,
        );
        expect(dbSetPrioSpy).toHaveBeenCalledWith(
          [player.id, "a different db id"],
          startDate,
          endDate,
          amount,
          reason,
        );
      });
    });

    it("Should throw error if user not authorized", async () => {
      const causeException = async () => {
        await prioService.setPlayerPrio(
          unauthorizedUser,
          [prioUserInCache],
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
