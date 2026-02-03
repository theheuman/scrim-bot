import { DbMock } from "../mocks/db.mock";
import { Player } from "../../src/models/Player";
import {
  GuildMember,
  InteractionReplyOptions,
  InteractionResponse,
  MessagePayload,
  User,
} from "discord.js";
import { CacheService } from "../../src/services/cache";
import { OverstatService } from "../../src/services/overstat";
import { Scrim, ScrimSignup } from "../../src/models/Scrims";
import { OverstatTournamentResponse } from "../../src/models/overstatModels";
import { ScrimSignupsWithPlayers } from "../../src/db/table.interfaces";
import SpyInstance = jest.SpyInstance;
import { PrioServiceMock } from "../mocks/prio.mock";
import { AuthMock } from "../mocks/auth.mock";
import { OverstatServiceMock } from "../mocks/overstat.mock";
import { BanService } from "../../src/services/ban";
import { HuggingFaceService } from "../../src/services/hugging-face";
import { BanServiceMock } from "../mocks/ban.mock";
import { HuggingFaceServiceMock } from "../mocks/hugging-face.mock";
import { SignupService } from "../../src/services/signups";
import { SignupServiceMock } from "../mocks/signups.mock";
import { ScrimService } from "../../src/services/scrim-service";

jest.mock("../../src/config", () => {
  return {
    appConfig: {
      lobbySize: 3,
    },
  };
});

describe("ScrimService", () => {
  let dbMock: DbMock;
  let cache: CacheService;
  let service: ScrimService;
  let prioServiceMock: PrioServiceMock;
  let overstatServiceMock: OverstatServiceMock;
  let authServiceMock: AuthMock;
  let mockBanService: BanService;
  let mockHuggingFaceService: HuggingFaceService;

  let insertPlayersSpy: SpyInstance;
  let huggingFaceUploadSpy: SpyInstance<
    Promise<string>,
    [overstatId: string, dateTime: Date, stats: OverstatTournamentResponse],
    string
  >;

  beforeEach(() => {
    dbMock = new DbMock();
    cache = new CacheService();
    overstatServiceMock = new OverstatServiceMock();
    prioServiceMock = new PrioServiceMock();
    mockBanService = new BanServiceMock() as BanService;
    mockHuggingFaceService =
      new HuggingFaceServiceMock() as unknown as HuggingFaceService;
    const mockSignupService =
      new SignupServiceMock() as unknown as SignupService;

    authServiceMock = new AuthMock();
    service = new ScrimService(
      dbMock,
      cache,
      overstatServiceMock as OverstatService,
      mockHuggingFaceService,
      mockSignupService as SignupService,
    );
    insertPlayersSpy = jest.spyOn(dbMock, "insertPlayers");
    insertPlayersSpy.mockReturnValue(
      Promise.resolve([
        {
          id: "111",
          discordId: "123",
          displayName: "TheHeuman",
        },
        {
          id: "111",
          discordId: "123",
          displayName: "TheHeuman",
          overstatId: "123",
        },
        { id: "444", discordId: "456", displayName: "Zboy", overstatId: "456" },
        {
          id: "777",
          discordId: "789",
          displayName: "Supreme",
          overstatId: "789",
        },
      ]),
    );
    jest
      .spyOn(authServiceMock, "memberIsAdmin")
      .mockImplementation((member) =>
        Promise.resolve(member === (theheuman as unknown as GuildMember)),
      );
    huggingFaceUploadSpy = jest.spyOn(
      mockHuggingFaceService,
      "uploadOverstatJson",
    );
  });

  const theheuman = { id: "123", displayName: "TheHeuman" } as User;

  describe("updateActiveScrims()", () => {
    it("Should get active scrims", async () => {
      cache.clear();
      cache.createScrim("something", {
        id: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
        dateTime: new Date(),
        discordChannel: "something",
        active: true,
      });
      cache.setSignups("ebb385a2-ba18-43b7-b0a3-44f2ff5589b9", []);
      jest.spyOn(dbMock, "getActiveScrims").mockImplementation(() => {
        return Promise.resolve([
          {
            id: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
            discord_channel: "something",
            date_time_field: "2024-10-14T20:10:35.706+00:00",
          },
        ]);
      });

      await service.updateActiveScrims();
      expect(cache.getScrim("something")?.id).toEqual(
        "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
      );
    });
  });

  describe("createScrim()", () => {
    it("Should create scrim", async () => {
      const channelId = "a valid id";
      cache.clear();

      const createNewSpy = jest.spyOn(dbMock, "createNewScrim");
      createNewSpy.mockReturnValue(Promise.resolve("a valid scrim id"));

      const now = new Date();
      await service.createScrim(channelId, now);
      expect(createNewSpy).toHaveBeenCalledWith(now, channelId);
      expect(cache.getScrim(channelId)?.id).toEqual("a valid scrim id");
    });
  });

  describe("closeScrim()", () => {
    it("Should delete a scrim and its associated signups", async () => {
      const channelId = "a valid id";
      const scrimId = "32451";
      cache.clear();
      cache.createScrim(channelId, {
        active: true,
        id: scrimId,
        discordChannel: channelId,
        dateTime: new Date(),
      });
      cache.setSignups(scrimId, []);
      jest
        .spyOn(dbMock, "closeScrim")
        .mockImplementation((discordChannelId: string) => {
          expect(discordChannelId).toEqual(channelId);
          return Promise.resolve([scrimId]);
        });

      await service.closeScrim(channelId);
      expect(cache.getScrim(channelId)?.id).toBeUndefined();
      expect(cache.getSignups(channelId)).toBeUndefined();
      expect.assertions(3);
    });
  });

  describe("computeScrim()", () => {
    const channelId = "a valid id";
    const scrimId = "32451-293p482439p8452397-fjg903q0pf9qh3verqhao";
    const overstatLink = "overstat.gg";
    const overstatId = "867235";
    const time = new Date();
    const tournamentStats: OverstatTournamentResponse = {
      total: 6,
      source: "statscode",
      games: [],
      teams: [],
      analytics: {
        qualityScore: 7.8947900682011936,
      },
    } as unknown as OverstatTournamentResponse;
    let overallStatsForIdSpy: jest.SpyInstance;
    let updateScrimSpy: jest.SpyInstance;
    let getTournamentIdSpy: jest.SpyInstance;
    let createNewScrimSpy: jest.SpyInstance;
    let getScrimsByDiscordChannel: jest.SpyInstance<
      Promise<Scrim[]>,
      [channelId: string],
      string
    >;

    beforeEach(() => {
      overallStatsForIdSpy = jest.spyOn(
        overstatServiceMock,
        "getOverallStatsForId",
      );
      updateScrimSpy = jest.spyOn(dbMock, "updateScrim");
      getTournamentIdSpy = jest.spyOn(overstatServiceMock, "getTournamentId");
      createNewScrimSpy = jest.spyOn(dbMock, "createNewScrim");
      getScrimsByDiscordChannel = jest.spyOn(
        dbMock,
        "getScrimsByDiscordChannel",
      );

      overallStatsForIdSpy.mockClear();
      updateScrimSpy.mockClear();
      getTournamentIdSpy.mockClear();
      getScrimsByDiscordChannel.mockClear();

      getTournamentIdSpy.mockReturnValue(overstatId);
      overallStatsForIdSpy.mockReturnValue(Promise.resolve(tournamentStats));

      cache.clear();
      cache.setSignups(scrimId, []);
    });

    it("Should compute a scrim", async () => {
      getScrimsByDiscordChannel.mockReturnValue(
        Promise.resolve([
          {
            active: true,
            id: scrimId,
            discordChannel: channelId,
            dateTime: time,
          },
        ]),
      );
      await service.computeScrim(channelId, [overstatLink]);
      expect(overallStatsForIdSpy).toHaveBeenCalledWith(overstatId);
      expect(overallStatsForIdSpy).toHaveBeenCalledTimes(1);

      expect(updateScrimSpy).toHaveBeenCalledWith(scrimId, {
        overstatId,
        overstatJson: tournamentStats,
      });
      expect(updateScrimSpy).toHaveBeenCalledTimes(1);

      expect(huggingFaceUploadSpy).toHaveBeenCalledWith(
        overstatId,
        time,
        tournamentStats,
      );

      expect(createNewScrimSpy).not.toHaveBeenCalled();
    });

    it("Should compute multiple lobbies for a single scrim", async () => {
      getScrimsByDiscordChannel.mockReturnValue(
        Promise.resolve([
          {
            active: true,
            id: scrimId,
            discordChannel: channelId,
            dateTime: time,
          },
        ]),
      );

      const lobby2OverstatLink = "link-different";
      const lobby2OverstatId = "id-different";

      const lobby3OverstatLink = "link-2-different";
      const lobby3OverstatId = "id-2-different";

      // need to mock overstat id
      getTournamentIdSpy.mockImplementation((link) => {
        switch (link) {
          case overstatLink:
            return overstatId;
          case lobby2OverstatLink:
            return lobby2OverstatId;
          case lobby3OverstatLink:
            return lobby3OverstatId;
        }
      });
      await service.computeScrim(channelId, [
        overstatLink,
        lobby2OverstatLink,
        lobby3OverstatLink,
      ]);
      expect(getTournamentIdSpy.mock.calls).toEqual([
        [overstatLink],
        [lobby2OverstatLink],
        [lobby3OverstatLink],
      ]);
      expect(getTournamentIdSpy).toHaveBeenCalledTimes(3);

      expect(overallStatsForIdSpy.mock.calls).toEqual([
        [overstatId],
        [lobby2OverstatId],
        [lobby3OverstatId],
      ]);
      expect(overallStatsForIdSpy).toHaveBeenCalledTimes(3);

      expect(updateScrimSpy).toHaveBeenCalledWith(scrimId, {
        overstatId,
        overstatJson: tournamentStats,
      });
      expect(updateScrimSpy).toHaveBeenCalledTimes(1);

      expect(createNewScrimSpy.mock.calls).toEqual([
        [time, channelId, lobby2OverstatId, tournamentStats],
        [time, channelId, lobby3OverstatId, tournamentStats],
      ]);
      expect(createNewScrimSpy).toHaveBeenCalledTimes(2);
      expect(huggingFaceUploadSpy.mock.calls).toEqual([
        [overstatId, time, tournamentStats],
        [lobby2OverstatId, time, tournamentStats],
        [lobby3OverstatId, time, tournamentStats],
      ]);
    });

    it("Should create a new scrim to compute a lobby for a scrim that has already been computed with a different overstat", async () => {
      getScrimsByDiscordChannel.mockReturnValue(
        Promise.resolve([
          {
            active: true,
            id: scrimId,
            discordChannel: channelId,
            dateTime: time,
            overstatId,
          },
        ]),
      );

      const newLobbyOverstatLink = overstatLink + "-different";
      const newLobbyOverstatId = overstatId + "-different";

      getTournamentIdSpy.mockImplementation((link) => {
        switch (link) {
          case overstatLink:
            return overstatId;
          case newLobbyOverstatLink:
            return newLobbyOverstatId;
        }
      });

      await service.computeScrim(channelId, [newLobbyOverstatLink]);

      // need to spy on db.get
      expect(getTournamentIdSpy).toHaveBeenCalledWith(newLobbyOverstatLink);
      expect(getTournamentIdSpy).toHaveBeenCalledTimes(1);

      expect(overallStatsForIdSpy).toHaveBeenCalledWith(newLobbyOverstatId);
      expect(overallStatsForIdSpy).toHaveBeenCalledTimes(1);

      expect(updateScrimSpy).toHaveBeenCalledTimes(0);

      expect(createNewScrimSpy).toHaveBeenCalledWith(
        time,
        channelId,
        newLobbyOverstatId,
        tournamentStats,
      );
    });

    it("Should update a scrim that has already been computed with the same overstat link", async () => {
      getScrimsByDiscordChannel.mockReturnValue(
        Promise.resolve([
          {
            active: true,
            id: scrimId,
            discordChannel: channelId,
            dateTime: time,
            overstatId,
          },
        ]),
      );

      await service.computeScrim(channelId, [overstatLink]);
      expect(overallStatsForIdSpy).toHaveBeenCalledWith(overstatId);

      expect(getTournamentIdSpy).toHaveBeenCalledWith(overstatLink);

      expect(updateScrimSpy).toHaveBeenCalledTimes(1);
      expect(updateScrimSpy).toHaveBeenCalledWith(scrimId, {
        overstatId,
        overstatJson: tournamentStats,
      });

      expect(createNewScrimSpy).not.toHaveBeenCalled();
    });

    it("should throw an error if no scrims are found", async () => {
      getScrimsByDiscordChannel.mockReturnValue(Promise.resolve([]));

      const causeException = async () => {
        await service.computeScrim(channelId, [overstatLink]);
      };

      await expect(causeException).rejects.toThrow(
        "No scrim found for that channel",
      );
      expect(getTournamentIdSpy).not.toHaveBeenCalled();
    });

    /* TODO: Update these tests to use the not yet implemented discord error reporting system 
        it("should throw an error if hf upload fails", async () => {
          huggingFaceUploadSpy.mockImplementationOnce(() => {
            throw Error("433 connection timeout");
          });
    
          const causeException = async () => {
            await service.computeScrim(channelId, [overstatLink]);
          };
    
          await expect(causeException).rejects.toThrow(
            "Completed computation, but upload to hugging face failed. Error: 433 connection timeout",
          );
          expect(updateScrimSpy).toHaveBeenCalledTimes(1);
        });
    
        it("should throw an error when multiple hf uploads fails", async () => {
          const lobby2OverstatLink = "link-different";
          const lobby2OverstatId = "id-different";
    
          const lobby3OverstatLink = "link-2-different";
          const lobby3OverstatId = "id-2-different";
    
          huggingFaceUploadSpy.mockImplementation((sentOverstatId) => {
            if (sentOverstatId === overstatId) {
              throw Error("433 connection timeout");
            } else if (sentOverstatId === lobby2OverstatId) {
              return Promise.resolve("commit url");
            } else if (sentOverstatId === lobby3OverstatId) {
              throw Error("File too large or something");
            } else {
              fail();
            }
          });
    
          getTournamentIdSpy.mockImplementation((link) => {
            switch (link) {
              case overstatLink:
                return overstatId;
              case lobby2OverstatLink:
                return lobby2OverstatId;
              case lobby3OverstatLink:
                return lobby3OverstatId;
            }
          });
    
          const causeException = async () => {
            await service.computeScrim(channelId, [
              overstatLink,
              lobby2OverstatLink,
              lobby3OverstatLink,
            ]);
          };
    
          await expect(causeException).rejects.toThrow(
            "Scrims computed, but failed to upload stats to hugging face for the following overstat ids:\nid-different: Error: 433 connection timeout\nid-2-different: Error: File too large or something",
          );
          expect(updateScrimSpy).toHaveBeenCalledTimes(1);
          expect(createNewScrimSpy).toHaveBeenCalledTimes(2);
        });
        */
  });
});
