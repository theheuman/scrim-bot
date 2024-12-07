import { GuildMember, User } from "discord.js";
import { Player, PlayerInsert } from "../../src/models/Player";
import { PrioService } from "../../src/services/prio";
import { DbMock } from "../mocks/db.mock";
import { CacheService } from "../../src/services/cache";
import { AuthService } from "../../src/services/auth";
import SpyInstance = jest.SpyInstance;
import { Scrim, ScrimSignup } from "../../src/models/Scrims";

describe("Prio", () => {
  let prioService: PrioService;
  let getPlayerSpy: SpyInstance<Player | undefined, [userId: string], string>;
  let setPlayerSpy: SpyInstance<
    void,
    [playerId: string, player: Player],
    string
  >;
  let authCheckSpy: SpyInstance<
    Promise<boolean>,
    [member: GuildMember],
    string
  >;
  let dbMock: DbMock;
  const player: Player = {
    discordId: "discordId",
    displayName: "mockPlayer",
    id: "dbId",
  };
  const unauthorizedMember: GuildMember = {
    id: "unauthorized",
  } as GuildMember;
  const authorizedMember: GuildMember = {
    id: "authorized",
  } as GuildMember;
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
    authCheckSpy = jest.spyOn(authServiceMock, "memberIsAdmin");
    authCheckSpy.mockImplementation((user) => {
      return Promise.resolve(user.id === authorizedMember.id);
    });
    getPlayerSpy = jest.spyOn(cacheMock, "getPlayer");
    getPlayerSpy.mockImplementation((id) => {
      return id === prioUserInCache.id ? player : undefined;
    });
    setPlayerSpy = jest.spyOn(cacheMock, "setPlayer");
    prioService = new PrioService(dbMock, cacheMock, authServiceMock);
  });

  describe("setPlayerPrio()", () => {
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
          authorizedMember,
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
          authorizedMember,
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
          authorizedMember,
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
          unauthorizedMember,
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

  describe("setTeamPrioForScrim()", () => {
    describe("correctly set prio", () => {
      beforeEach(() => {});

      it("should set prio for teams from its players", async () => {
        const today = new Date();
        const scrim: Scrim = {
          dateTime: today,
        } as Scrim;
        const lowPrioPlayerOnTeam: Player = {
          discordId: "on team discord id",
          displayName: "Bad Boi",
          id: "1",
        };
        const highPrioPlayerOnTeam: Player = {
          discordId: "on team discord id 2",
          displayName: "Good Boi",
          id: "2",
        };
        const lowPrioPlayerFreeAgent: Player = {
          discordId: "free agent discord id",
          displayName: "free agent",
          id: "3",
        };
        const team: ScrimSignup = {
          date: today,
          players: [lowPrioPlayerOnTeam, highPrioPlayerOnTeam],
          signupId: "",
          signupPlayer: {
            id: "",
            discordId: "",
            displayName: "",
          },
          teamName: "",
        };
        const teams = [team];
        const dbSpy = jest.spyOn(dbMock, "getPrio");
        dbSpy.mockReturnValue(
          // return low prio for 1, and two high prio ticks for another, also return low prio for someone not participating in the scrim
          Promise.resolve([
            { id: lowPrioPlayerOnTeam.id, amount: -1, reason: "bad boi" },
            { id: highPrioPlayerOnTeam.id, amount: 1, reason: "good boi" },
            { id: highPrioPlayerOnTeam.id, amount: 1, reason: "good boi" },
            {
              id: lowPrioPlayerFreeAgent.id,
              amount: -400,
              reason: "SMH Tried to nuke the entire server",
            },
          ]),
        );
        const prioTeams = await prioService.getTeamPrioForScrim(scrim, teams);
        expect(prioTeams).toEqual([
          {
            date: today,
            players: [lowPrioPlayerOnTeam, highPrioPlayerOnTeam],
            signupId: "",
            signupPlayer: {
              id: "",
              discordId: "",
              displayName: "",
            },
            teamName: "",
            prio: {
              amount: 1,
              reasons: "Bad Boi: bad boi; Good Boi: good boi, good boi",
            },
          },
        ]);
      });
    });
  });
});
