import { ScrimSignups } from "../../src/services/signups";
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
import { PrioService } from "../../src/services/prio";
import { ScrimSignupsWithPlayers } from "../../src/db/table.interfaces";
import SpyInstance = jest.SpyInstance;
import { PrioServiceMock } from "../mocks/prio.mock";
import { AuthMock } from "../mocks/auth.mock";
import { AuthService } from "../../src/services/auth";
import { OverstatServiceMock } from "../mocks/overstat.mock";
import { DiscordService } from "../../src/services/discord";
import { DiscordServiceMock } from "../mocks/discord-service.mock";
import { BanService } from "../../src/services/ban";
import { BanServiceMock } from "../mocks/ban.mock";

jest.mock("../../src/config", () => {
  return {
    appConfig: {
      lobbySize: 3,
    },
  };
});

describe("Signups", () => {
  let dbMock: DbMock;
  let cache: CacheService;
  let signups: ScrimSignups;
  let prioServiceMock: PrioServiceMock;
  let overstatServiceMock: OverstatServiceMock;
  let authServiceMock: AuthMock;
  let mockBanService: BanService;

  let insertPlayersSpy: SpyInstance;

  beforeEach(() => {
    dbMock = new DbMock();
    cache = new CacheService();
    overstatServiceMock = new OverstatServiceMock();
    prioServiceMock = new PrioServiceMock();
    mockBanService = new BanServiceMock() as BanService;

    authServiceMock = new AuthMock();
    signups = new ScrimSignups(
      dbMock,
      cache,
      overstatServiceMock as OverstatService,
      prioServiceMock as PrioService,
      authServiceMock as AuthService,
      new DiscordServiceMock() as DiscordService,
      mockBanService,
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
  });

  const theheuman = { id: "123", displayName: "TheHeuman" } as User;
  const zboy = { id: "456", displayName: "Zboy" } as User;
  const supreme = { id: "789", displayName: "Supreme" } as User;
  const revy = { id: "4368", displayName: "revy2hands" } as User;
  const cTreazy = { id: "452386", displayName: "treazy" } as User;
  const mikey = { id: "32576", displayName: "//baev" } as User;

  describe("addTeam()", () => {
    it("Should add a team", async () => {
      jest.useFakeTimers();
      const now = new Date();
      jest.setSystemTime(now);
      const expectedSignup = {
        teamName: "Fineapples",
        scrimId: "32451",
        signupId: "4685",
        discordChannelId: "a forum post",
      };

      cache.createScrim(expectedSignup.discordChannelId, {
        id: expectedSignup.scrimId,
        discordChannel: expectedSignup.discordChannelId,
        active: true,
      } as Scrim);
      jest
        .spyOn(dbMock, "addScrimSignup")
        .mockImplementation(
          (
            teamName: string,
            scrimId: string,
            userId: string,
            playerId: string,
            playerIdTwo: string,
            playerIdThree: string,
          ) => {
            expect(teamName).toEqual(expectedSignup.teamName);
            expect(scrimId).toEqual(expectedSignup.scrimId);
            expect(userId).toEqual("111");
            expect(playerId).toEqual("111");
            expect(playerIdTwo).toEqual("444");
            expect(playerIdThree).toEqual("777");
            return Promise.resolve(expectedSignup.signupId);
          },
        );

      const actualScrimSignup = await signups.addTeam(
        expectedSignup.discordChannelId,
        expectedSignup.teamName,
        theheuman as unknown as GuildMember,
        [theheuman, zboy, supreme],
      );
      const expectedReturnSignup: ScrimSignup = {
        date: now,
        teamName: expectedSignup.teamName,
        signupId: expectedSignup.signupId,
        players: [
          {
            id: "111",
            discordId: theheuman.id,
            displayName: theheuman.displayName,
            overstatId: theheuman.id,
          },
          {
            id: "444",
            discordId: zboy.id,
            displayName: zboy.displayName,
            overstatId: zboy.id,
          },
          {
            id: "777",
            discordId: supreme.id,
            displayName: supreme.displayName,
            overstatId: supreme.id,
          },
        ],
        signupPlayer: {
          id: "111",
          discordId: theheuman.id,
          displayName: theheuman.displayName,
        },
      };
      expect(actualScrimSignup).toEqual(expectedReturnSignup);
      expect(insertPlayersSpy).toHaveBeenCalledWith([
        { discordId: "123", displayName: "TheHeuman" },
        { discordId: "123", displayName: "TheHeuman" },
        { discordId: "456", displayName: "Zboy" },
        { discordId: "789", displayName: "Supreme" },
      ]);
      expect.assertions(8);
    });

    it("Should not add a team because there is no scrim for that channel", async () => {
      const causeException = async () => {
        await signups.addTeam("", "", theheuman as unknown as GuildMember, []);
      };

      await expect(causeException).rejects.toThrow(
        "No scrim found for that channel",
      );
    });

    it("Should not add a team because duplicate team name", async () => {
      const expectedSignup = {
        scrimId: "32451",
        signupId: "4685",
        discordChannelId: "a forum post",
      };

      cache.createScrim(expectedSignup.discordChannelId, {
        id: expectedSignup.scrimId,
        discordChannel: expectedSignup.discordChannelId,
        active: true,
      } as Scrim);

      await signups.addTeam(
        expectedSignup.discordChannelId,
        "Fineapples",
        theheuman as unknown as GuildMember,
        [theheuman, revy, cTreazy],
      );

      const causeException = async () => {
        await signups.addTeam(
          expectedSignup.discordChannelId,
          "Fineapples",
          theheuman as unknown as GuildMember,
          [zboy, supreme, mikey],
        );
      };

      await expect(causeException).rejects.toThrow("Duplicate team name");
    });

    it("Should not add a team because duplicate player", async () => {
      const expectedSignup = {
        scrimId: "32451",
        signupId: "4685",
        discordChannelId: "a forum post",
      };

      cache.createScrim(expectedSignup.discordChannelId, {
        id: expectedSignup.scrimId,
        discordChannel: expectedSignup.discordChannelId,
        active: true,
      } as Scrim);

      const causeException = async () => {
        await signups.addTeam(
          expectedSignup.discordChannelId,
          "Dude Cube",
          theheuman as unknown as GuildMember,
          [theheuman, supreme, mikey],
        );
      };
      await signups.addTeam(
        expectedSignup.discordChannelId,
        "Fineapples",
        theheuman as unknown as GuildMember,
        [theheuman, revy, cTreazy],
      );

      await expect(causeException).rejects.toThrow(
        "Player already signed up on different team: TheHeuman <@123> on team Fineapples",
      );
    });

    it("Should not add a team because there aren't three players", async () => {
      const expectedSignup = {
        scrimId: "32451",
        signupId: "4685",
        discordChannelId: "a forum post",
      };

      cache.createScrim(expectedSignup.discordChannelId, {
        id: expectedSignup.scrimId,
        discordChannel: expectedSignup.discordChannelId,
        active: true,
      } as Scrim);

      const causeException = async () => {
        await signups.addTeam(
          expectedSignup.discordChannelId,
          "",
          theheuman as unknown as GuildMember,
          [],
        );
      };

      await expect(causeException).rejects.toThrow(
        "Exactly three players must be provided",
      );
    });

    it("Should not add a team because there are 2 of the same player on a team", async () => {
      cache.setSignups("scrim 1", []);
      const causeException = async () => {
        await signups.addTeam(
          "scrim 1",
          "Fineapples",
          supreme as unknown as GuildMember,
          [supreme, supreme, mikey],
        );
      };

      await expect(causeException).rejects.toThrow("");
    });

    describe("Missing overstat id", () => {
      beforeEach(() => {
        cache.createScrim("1", {
          id: "2",
          discordChannel: "1",
          active: true,
          dateTime: new Date(),
        } as Scrim);

        insertPlayersSpy.mockReturnValueOnce(
          Promise.resolve([
            {
              id: "111",
              discordId: "123",
              displayName: "TheHeuman",
              overstatId: "123",
            },
            {
              id: "111",
              discordId: "123",
              displayName: "TheHeuman",
            },
            {
              id: "444",
              discordId: "456",
              displayName: "Zboy",
              overstatId: "456",
            },
            {
              id: "777",
              discordId: "789",
              displayName: "Supreme",
              overstatId: "789",
            },
          ]),
        );
      });
      it("Should add a team because signup member is an admin", async () => {
        const actualSignup = await signups.addTeam(
          "1",
          "Dude Cube",
          theheuman as unknown as GuildMember,
          [theheuman, supreme, mikey],
        );

        expect(actualSignup).toBeDefined();
      });

      it("Should not add a team because a player doesn't have an overstat id", async () => {
        const causeException = async () => {
          await signups.addTeam(
            "1",
            "Dude Cube",
            supreme as unknown as GuildMember,
            [theheuman, supreme, mikey],
          );
        };

        await expect(causeException).rejects.toThrow(
          "No overstat linked for TheHeuman",
        );
      });

      it("Should not add a team because a player is scrim banned", async () => {
        const causeException = async () => {
          await signups.addTeam(
            "1",
            "Dude Cube",
            supreme as unknown as GuildMember,
            [theheuman, supreme, mikey],
          );
        };

        jest.spyOn(mockBanService, "teamHasBan").mockReturnValue(
          Promise.resolve({
            hasBan: true,
            reason: "Supreme: A valid reason for scrim ban",
          }),
        );

        await expect(causeException).rejects.toThrow(
          "One or more players are scrim banned. Supreme: A valid reason for scrim ban",
        );
      });
    });
  });

  describe("getSignups()", () => {
    it("Should sort teams correctly by prio and signup date", async () => {
      // both positive and negative prio
      // two teams tied for prio with different dates
      const highPrioTeam: ScrimSignupsWithPlayers = {
        date_time: "2024-10-28T20:10:35.706+00:00",
        team_name: "High Prio",
      } as ScrimSignupsWithPlayers;
      const lowPrioTeam: ScrimSignupsWithPlayers = {
        date_time: "2024-10-10T20:10:35.706+00:00",
        team_name: "Low Prio",
      } as ScrimSignupsWithPlayers;
      const mediumPrioTeam1: ScrimSignupsWithPlayers = {
        date_time: "2024-10-13T20:10:35.706+00:00",
        team_name: "Medium Prio 1",
      } as ScrimSignupsWithPlayers;
      const mediumPrioTeam2: ScrimSignupsWithPlayers = {
        date_time: "2024-10-14T20:10:35.706+00:00",
        team_name: "Medium Prio 2",
      } as ScrimSignupsWithPlayers;

      jest
        .spyOn(prioServiceMock, "getTeamPrioForScrim")
        .mockImplementation((_, teams: ScrimSignup[]) => {
          for (const team of teams) {
            switch (team.teamName) {
              case highPrioTeam.team_name:
                team.prio = {
                  amount: 1,
                  reasons: "Player 1 has league prio",
                };
                break;
              case mediumPrioTeam1.team_name:
                team.prio = {
                  amount: 0,
                  reasons: "",
                };
                break;
              case mediumPrioTeam2.team_name:
                team.prio = {
                  amount: 0,
                  reasons: "",
                };
                break;
              case lowPrioTeam.team_name:
                team.prio = {
                  amount: -5,
                  reasons: "Player 1 is an enemy of the people",
                };
                break;
            }
          }
          return Promise.resolve(teams);
        });
      jest.spyOn(cache, "getScrim").mockReturnValue({
        id: "",
        dateTime: new Date(),
        discordChannel: "",
        active: false,
      });
      jest
        .spyOn(dbMock, "getScrimSignupsWithPlayers")
        .mockReturnValue(
          Promise.resolve([
            lowPrioTeam,
            mediumPrioTeam2,
            highPrioTeam,
            mediumPrioTeam1,
          ]),
        );

      const generateUndefinedPlayer = (): Player => {
        return {
          discordId: undefined,
          displayName: undefined,
          elo: undefined,
          id: undefined,
          overstatId: undefined,
        } as unknown as Player;
      };
      const generateScrimSignupWithPlayers = (
        team: ScrimSignupsWithPlayers,
        prio: {
          amount: number;
          reasons: string;
        },
      ): ScrimSignup => {
        return {
          teamName: team.team_name,
          players: [
            generateUndefinedPlayer(),
            generateUndefinedPlayer(),
            generateUndefinedPlayer(),
          ],
          signupId: "for now we dont get the id",
          signupPlayer: generateUndefinedPlayer(),
          date: new Date(team.date_time),
          prio,
        };
      };
      const expectedMainTeams: ScrimSignup[] = [
        generateScrimSignupWithPlayers(highPrioTeam, {
          amount: 1,
          reasons: "Player 1 has league prio",
        }),
        generateScrimSignupWithPlayers(mediumPrioTeam1, {
          amount: 0,
          reasons: "",
        }),
        generateScrimSignupWithPlayers(mediumPrioTeam2, {
          amount: 0,
          reasons: "",
        }),
      ];
      const expectedWaitTeams: ScrimSignup[] = [
        generateScrimSignupWithPlayers(lowPrioTeam, {
          amount: -5,
          reasons: "Player 1 is an enemy of the people",
        }),
      ];
      const teamsSignedUp = await signups.getSignups("");
      expect(teamsSignedUp).toEqual({
        mainList: expectedMainTeams,
        waitList: expectedWaitTeams,
      });
    });

    it("Should throw error when no scrim", async () => {
      cache.clear();

      const causeException = async () => {
        await signups.getSignups("");
      };

      await expect(causeException).rejects.toThrow(
        "No scrim found for that channel",
      );
    });
  });

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

      await signups.updateActiveScrims();
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
      await signups.createScrim(channelId, now);
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

      await signups.closeScrim(channelId);
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
      await signups.computeScrim(channelId, [overstatLink]);
      expect(overallStatsForIdSpy).toHaveBeenCalledWith(overstatId);
      expect(overallStatsForIdSpy).toHaveBeenCalledTimes(1);

      expect(updateScrimSpy).toHaveBeenCalledWith(scrimId, {
        overstatId,
        overstatJson: tournamentStats,
      });
      expect(updateScrimSpy).toHaveBeenCalledTimes(1);

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
      await signups.computeScrim(channelId, [
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

      await signups.computeScrim(channelId, [newLobbyOverstatLink]);

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

      await signups.computeScrim(channelId, [overstatLink]);
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
        await signups.computeScrim(channelId, [overstatLink]);
      };

      await expect(causeException).rejects.toThrow(
        "No scrim found for that channel",
      );
      expect(getTournamentIdSpy).not.toHaveBeenCalled();
    });
  });
});
