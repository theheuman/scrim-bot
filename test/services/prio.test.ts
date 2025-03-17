import { User } from "discord.js";
import { Player, PlayerInsert } from "../../src/models/Player";
import { PrioService } from "../../src/services/prio";
import { DbMock } from "../mocks/db.mock";
import { CacheService } from "../../src/services/cache";
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
  let dbMock: DbMock;
  const player: Player = {
    discordId: "discordId",
    displayName: "mockPlayer",
    id: "dbId",
  };
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
    getPlayerSpy = jest.spyOn(cacheMock, "getPlayer");
    getPlayerSpy.mockImplementation((id) => {
      return id === prioUserInCache.id ? player : undefined;
    });
    setPlayerSpy = jest.spyOn(cacheMock, "setPlayer");
    prioService = new PrioService(dbMock, cacheMock);
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
  });

  describe("setTeamPrioForScrim()", () => {
    describe("correctly set prio", () => {
      beforeEach(() => {});

      it("should set low prio for teams from its players", async () => {
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
        const scrimPassHolder: Player = {
          discordId: "on team discord id 4",
          displayName: "Rich boi",
          id: "4",
        };
        const team: ScrimSignup = {
          date: today,
          players: [lowPrioPlayerOnTeam, highPrioPlayerOnTeam, scrimPassHolder],
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
            {
              id: lowPrioPlayerOnTeam.id,
              discordId: lowPrioPlayerOnTeam.discordId,
              amount: -1,
              reason: "bad boi",
            },
            {
              id: highPrioPlayerOnTeam.id,
              discordId: highPrioPlayerOnTeam.discordId,
              amount: 1,
              reason: "good boi",
            },
            {
              id: highPrioPlayerOnTeam.id,
              discordId: highPrioPlayerOnTeam.discordId,
              amount: 1,
              reason: "good boi",
            },
            {
              id: lowPrioPlayerFreeAgent.id,
              discordId: lowPrioPlayerFreeAgent.discordId,
              amount: -400,
              reason: "SMH Tried to nuke the entire server",
            },
          ]),
        );
        const prioTeams = await prioService.getTeamPrioForScrim(scrim, teams, [
          scrimPassHolder.discordId,
          lowPrioPlayerOnTeam.discordId,
        ]);
        // team should have
        //   +2 prio from the high prio player since they have two +1 prio entries
        //   +1 prio from the scrim pass holder
        //   -1 prio from the low prio player (They have a scrim pass but that is ignored when they have low prio)
        // For a total of +2 prio
        // but with Sly's override one low prio player overrides the whole squad, so -1
        expect(prioTeams).toEqual([
          {
            date: today,
            players: [
              lowPrioPlayerOnTeam,
              highPrioPlayerOnTeam,
              scrimPassHolder,
            ],
            signupId: "",
            signupPlayer: {
              id: "",
              discordId: "",
              displayName: "",
            },
            teamName: "",
            prio: {
              amount: -1,
              reasons:
                "Bad Boi: bad boi; Good Boi: good boi, good boi; Rich boi: Scrim pass",
            },
          },
        ]);
      });
      it("should set high prio for teams from its players", async () => {
        const today = new Date();
        const scrim: Scrim = {
          dateTime: today,
        } as Scrim;
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
        const scrimPassHolder: Player = {
          discordId: "on team discord id 4",
          displayName: "Rich boi",
          id: "4",
        };
        const team: ScrimSignup = {
          date: today,
          players: [highPrioPlayerOnTeam, scrimPassHolder],
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
            {
              id: highPrioPlayerOnTeam.id,
              discordId: highPrioPlayerOnTeam.discordId,
              amount: 1,
              reason: "good boi",
            },
            {
              id: highPrioPlayerOnTeam.id,
              discordId: highPrioPlayerOnTeam.discordId,
              amount: 1,
              reason: "good boi",
            },
            {
              id: lowPrioPlayerFreeAgent.id,
              discordId: lowPrioPlayerFreeAgent.discordId,
              amount: -400,
              reason: "SMH Tried to nuke the entire server",
            },
          ]),
        );
        const prioTeams = await prioService.getTeamPrioForScrim(scrim, teams, [
          scrimPassHolder.discordId,
        ]);
        // team should have
        //   +2 prio from the high prio player since they have two +1 prio entries
        //   +1 prio from the scrim pass holder
        // For a total of +3 prio
        // but with Sly's override one prios do not stack so only +1
        expect(prioTeams).toEqual([
          {
            date: today,
            players: [highPrioPlayerOnTeam, scrimPassHolder],
            signupId: "",
            signupPlayer: {
              id: "",
              discordId: "",
              displayName: "",
            },
            teamName: "",
            prio: {
              amount: 1,
              reasons: "Good Boi: good boi, good boi; Rich boi: Scrim pass",
            },
          },
        ]);
      });
    });
  });
});
