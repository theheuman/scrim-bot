import { ScrimSignups } from "../../src/services/signups";
import { DbMock } from "../mocks/db.mock";
import { Player, PlayerStatInsert } from "../../src/models/Player";
import { GuildMember, User } from "discord.js";
import { CacheService } from "../../src/services/cache";
import { OverstatService } from "../../src/services/overstat";
import { Scrim, ScrimSignup } from "../../src/models/Scrims";
import { OverstatTournamentResponse } from "../../src/models/overstatModels";
import { mockOverstatResponse } from "../mocks/overstat-response.mock";
import { PrioService } from "../../src/services/prio";
import { ScrimSignupsWithPlayers } from "../../src/db/table.interfaces";
import SpyInstance = jest.SpyInstance;
import { PrioServiceMock } from "../mocks/prio.mock";
import { AuthMock } from "../mocks/auth.mock";
import { AuthService } from "../../src/services/auth";
import { OverstatServiceMock } from "../mocks/overstat.mock";
import { DiscordService } from "../../src/services/discord";
import { DiscordServiceMock } from "../mocks/discord-service.mock";

describe("Signups", () => {
  let dbMock: DbMock;
  let cache: CacheService;
  let signups: ScrimSignups;
  let prioServiceMock: PrioServiceMock;
  let overstatService: OverstatServiceMock;
  let authServiceMock: AuthMock;

  let insertPlayersSpy: SpyInstance;

  beforeEach(() => {
    dbMock = new DbMock();
    cache = new CacheService();
    overstatService = new OverstatServiceMock();
    prioServiceMock = new PrioServiceMock();

    authServiceMock = new AuthMock();
    signups = new ScrimSignups(
      dbMock,
      cache,
      overstatService as OverstatService,
      prioServiceMock as PrioService,
      authServiceMock as AuthService,
      new DiscordServiceMock() as DiscordService,
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
      jest
        .spyOn(dbMock, "createNewScrim")
        .mockImplementation(
          (_: Date, discordChannelID: string, skill?: number | null) => {
            expect(discordChannelID).toEqual(channelId);
            expect(skill).toEqual(undefined);
            return Promise.resolve("a valid scrim id");
          },
        );

      await signups.createScrim(channelId, new Date());
      expect(cache.getScrim(channelId)?.id).toEqual("a valid scrim id");
      expect.assertions(3);
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
    const scrimId = "32451";
    const overstatLink = "overstat.gg";
    const skill = 1;
    const time = new Date();
    const tournamentStats: OverstatTournamentResponse =
      JSON.parse(mockOverstatResponse);
    const playerStats: PlayerStatInsert[] = [];

    it("Should compute a scrim", async () => {
      cache.clear();
      cache.setSignups(scrimId, []);
      cache.createScrim(channelId, {
        active: true,
        id: scrimId,
        discordChannel: channelId,
        dateTime: new Date(),
      });

      jest
        .spyOn(overstatService, "getOverallStats")
        .mockImplementation((serviceOverstatLink: string) => {
          expect(serviceOverstatLink).toEqual(overstatLink);
          return Promise.resolve(tournamentStats);
        });

      jest
        .spyOn(overstatService, "matchPlayers")
        .mockImplementation(
          (
            serviceScrimId: string,
            serviceSignups: ScrimSignup[],
            serviceTournamentStats: OverstatTournamentResponse,
          ) => {
            expect(serviceScrimId).toEqual(scrimId);
            expect(serviceSignups).toEqual([]);
            expect(serviceTournamentStats).toEqual(tournamentStats);
            return playerStats;
          },
        );

      jest
        .spyOn(dbMock, "computeScrim")
        .mockImplementation(
          (
            dbScrimId: string,
            dbOverstatLink: string,
            dbSkill: number,
            dbPlayerStats: PlayerStatInsert[],
          ) => {
            expect(dbScrimId).toEqual(scrimId);
            expect(dbOverstatLink).toEqual(overstatLink);
            expect(dbSkill).toEqual(skill);
            expect(dbPlayerStats).toEqual(playerStats);
            return Promise.resolve(["a ScrimPlayerStat ID"]);
          },
        );

      await signups.computeScrim(channelId, overstatLink, 1);
      const cacheScrim = cache.getScrim(channelId);
      expect(cacheScrim?.skill).toEqual(skill);
      expect(cacheScrim?.overstatLink).toEqual(overstatLink);
      expect.assertions(10);
    });

    it("Should create a new scrim to compute a scrim that has already been computed with a different overstat", async () => {
      cache.clear();
      cache.setSignups(scrimId, []);
      cache.createScrim(channelId, {
        active: true,
        id: scrimId,
        discordChannel: channelId,
        dateTime: time,
        overstatLink: "overstat.gg/different",
        skill: 1,
      });

      jest
        .spyOn(overstatService, "getOverallStats")
        .mockImplementation((serviceOverstatLink: string) => {
          expect(serviceOverstatLink).toEqual(overstatLink);
          return Promise.resolve(tournamentStats);
        });

      jest
        .spyOn(dbMock, "createNewScrim")
        .mockImplementation((dbDateTime: Date, dbDiscordChannelID: string) => {
          expect(dbDateTime).toEqual(time);
          expect(dbDiscordChannelID).toEqual(channelId);
          return Promise.resolve("a different scrim id");
        });

      jest
        .spyOn(overstatService, "matchPlayers")
        .mockImplementation(
          (
            serviceScrimId: string,
            serviceSignups: ScrimSignup[],
            serviceTournamentStats: OverstatTournamentResponse,
          ) => {
            expect(serviceScrimId).toEqual("a different scrim id");
            expect(serviceSignups).toEqual([]);
            expect(serviceTournamentStats).toEqual(tournamentStats);
            return playerStats;
          },
        );

      jest
        .spyOn(dbMock, "computeScrim")
        .mockImplementation(
          (
            dbScrimId: string,
            dbOverstatLink: string,
            dbSkill: number,
            dbPlayerStats: PlayerStatInsert[],
          ) => {
            expect(dbScrimId).toEqual("a different scrim id");
            expect(dbOverstatLink).toEqual(overstatLink);
            expect(dbSkill).toEqual(skill);
            expect(dbPlayerStats).toEqual(playerStats);
            return Promise.resolve(["a ScrimPlayerStat ID"]);
          },
        );

      await signups.computeScrim(channelId, overstatLink, 1);
      const cacheScrim = cache.getScrim(channelId);
      expect(cacheScrim?.skill).toEqual(skill);
      expect(cacheScrim?.overstatLink).toEqual(overstatLink);
      expect.assertions(12);
    });

    it("Should not create a new scrim to compute a scrim that has already been computed with the same overstat", async () => {
      cache.clear();
      cache.setSignups(scrimId, []);
      cache.createScrim(channelId, {
        active: true,
        id: scrimId,
        discordChannel: channelId,
        dateTime: time,
        overstatLink: "overstat.gg",
        skill: 5,
      });

      jest
        .spyOn(overstatService, "getOverallStats")
        .mockImplementation((serviceOverstatLink: string) => {
          expect(serviceOverstatLink).toEqual(overstatLink);
          return Promise.resolve(tournamentStats);
        });

      const createSpy = jest.spyOn(dbMock, "createNewScrim");

      jest
        .spyOn(overstatService, "matchPlayers")
        .mockImplementation(
          (
            serviceScrimId: string,
            serviceSignups: ScrimSignup[],
            serviceTournamentStats: OverstatTournamentResponse,
          ) => {
            expect(serviceScrimId).toEqual(scrimId);
            expect(serviceSignups).toEqual([]);
            expect(serviceTournamentStats).toEqual(tournamentStats);
            return playerStats;
          },
        );

      jest
        .spyOn(dbMock, "computeScrim")
        .mockImplementation(
          (
            dbScrimId: string,
            dbOverstatLink: string,
            dbSkill: number,
            dbPlayerStats: PlayerStatInsert[],
          ) => {
            expect(dbScrimId).toEqual(scrimId);
            expect(dbOverstatLink).toEqual(overstatLink);
            expect(dbSkill).toEqual(skill);
            expect(dbPlayerStats).toEqual(playerStats);
            return Promise.resolve(["a ScrimPlayerStat ID"]);
          },
        );

      createSpy.mockClear();
      await signups.computeScrim(channelId, overstatLink, 1);
      const cacheScrim = cache.getScrim(channelId);
      expect(cacheScrim?.skill).toEqual(1);
      expect(cacheScrim?.overstatLink).toEqual(overstatLink);
      expect(createSpy).toHaveBeenCalledTimes(0);
      expect.assertions(11);
    });
  });
});
