import { ScrimSignups } from "../src/services/signups";
import { DbMock } from "./mocks/db.mock";
import { PlayerInsert, PlayerStatInsert } from "../src/models/Player";
import { User } from "discord.js";
import { Cache } from "../src/services/cache";
import { OverstatService } from "../src/services/overstat";
import { Scrim, ScrimSignup } from "../src/models/Scrims";
import {
  OverstatTournamentResponse,
  PlayerTournamentStats,
} from "../src/models/overstatModels";
import { mockOverstatResponse } from "./mocks/overstat-response.mock";

describe("Signups", () => {
  let dbMock: DbMock;
  let cache: Cache;
  let signups: ScrimSignups;
  let overstatService: OverstatService;

  beforeEach(() => {
    dbMock = new DbMock();
    cache = new Cache();
    overstatService = new OverstatService();
    signups = new ScrimSignups(dbMock, cache, overstatService);
  });

  const theheuman = { id: "123", displayName: "TheHeuman" } as User;
  const zboy = { id: "456", displayName: "Zboy" } as User;
  const supreme = { id: "789", displayName: "Supreme" } as User;
  const revy = { id: "4368", displayName: "revy2hands" } as User;
  const cTreazy = { id: "452386", displayName: "treazy" } as User;
  const mikey = { id: "32576", displayName: "//baev" } as User;

  describe("addTeam()", () => {
    it("Should add a team", async () => {
      const expectedSignup = {
        teamName: "Fineapples",
        scrimId: "32451",
        signupId: "4685",
      };

      cache.setSignups("32451", []);
      jest.spyOn(dbMock, "insertPlayers").mockImplementation((players) => {
        const expected: PlayerInsert[] = [
          { discordId: "123", displayName: "TheHeuman" },
          { discordId: "123", displayName: "TheHeuman" },
          { discordId: "456", displayName: "Zboy" },
          { discordId: "789", displayName: "Supreme" },
        ];
        expect(players).toEqual(expected);
        return Promise.resolve(["111", "444", "777"]);
      });

      jest
        .spyOn(dbMock, "addScrimSignup")
        .mockImplementation(
          (
            teamName: string,
            scrimId: string,
            playerId: string,
            playerIdTwo: string,
            playerIdThree: string,
          ) => {
            expect(teamName).toEqual(expectedSignup.teamName);
            expect(scrimId).toEqual(expectedSignup.scrimId);
            expect(playerId).toEqual("111");
            expect(playerIdTwo).toEqual("444");
            expect(playerIdThree).toEqual("777");
            return Promise.resolve(expectedSignup.signupId);
          },
        );

      const signupId = await signups.addTeam(
        expectedSignup.scrimId,
        expectedSignup.teamName,
        theheuman,
        [theheuman, zboy, supreme],
      );
      expect(signupId).toEqual(expectedSignup.signupId);
      expect.assertions(7);
    });

    it("Should not add a team because there is no scrim with that id", async () => {
      const causeException = async () => {
        await signups.addTeam("", "", theheuman, []);
      };

      await expect(causeException).rejects.toThrow(
        "No active scrim with that scrim id",
      );
    });

    it("Should not add a team because duplicate team name", async () => {
      cache.setSignups("scrim 1", []);
      const causeException = async () => {
        await signups.addTeam("scrim 1", "Fineapples", theheuman, [
          zboy,
          supreme,
          mikey,
        ]);
      };
      await signups.addTeam("scrim 1", "Fineapples", theheuman, [
        theheuman,
        revy,
        cTreazy,
      ]);

      await expect(causeException).rejects.toThrow("Duplicate team name");
    });

    it("Should not add a team because duplicate player", async () => {
      cache.setSignups("scrim 1", []);
      const causeException = async () => {
        await signups.addTeam("scrim 1", "Dude Cube", theheuman, [
          theheuman,
          supreme,
          mikey,
        ]);
      };
      await signups.addTeam("scrim 1", "Fineapples", theheuman, [
        theheuman,
        revy,
        cTreazy,
      ]);

      await expect(causeException).rejects.toThrow(
        "Player already signed up on different team: TheHeuman <@123> on team Fineapples",
      );
    });

    it("Should not add a team because there aren't three players", async () => {
      cache.setSignups("32451", []);
      const causeException = async () => {
        await signups.addTeam("32451", "", theheuman, []);
      };

      await expect(causeException).rejects.toThrow(
        "Exactly three players must be provided",
      );
    });

    it("Should not add a team because there are 2 of the same player on a team", async () => {
      cache.setSignups("scrim 1", []);
      const causeException = async () => {
        await signups.addTeam("scrim 1", "Fineapples", supreme, [
          supreme,
          supreme,
          mikey,
        ]);
      };

      await expect(causeException).rejects.toThrow("");
    });
  });

  describe("getSignups()", () => {
    it("Should get all teams", async () => {
      const theheuman = { id: "123", displayName: "TheHeuman" } as User;
      const zboy = { id: "456", displayName: "Zboy" } as User;
      const supreme = { id: "789", displayName: "Supreme" } as User;
      const expectedSignup = {
        teamName: "Fineapples",
        scrimId: "32451",
        signupId: "4685",
      };

      cache.setSignups("32451", []);
      jest.spyOn(dbMock, "insertPlayers").mockImplementation((players) => {
        const expected: PlayerInsert[] = [
          { discordId: "123", displayName: "TheHeuman" },
          { discordId: "123", displayName: "TheHeuman" },
          { discordId: "456", displayName: "Zboy" },
          { discordId: "789", displayName: "Supreme" },
        ];
        expect(players).toEqual(expected);
        return Promise.resolve(["111", "444", "777"]);
      });

      jest
        .spyOn(dbMock, "addScrimSignup")
        .mockImplementation(
          (
            teamName: string,
            scrimId: string,
            playerId: string,
            playerIdTwo: string,
            playerIdThree: string,
          ) => {
            expect(teamName).toEqual(expectedSignup.teamName);
            expect(scrimId).toEqual(expectedSignup.scrimId);
            expect(playerId).toEqual("111");
            expect(playerIdTwo).toEqual("444");
            expect(playerIdThree).toEqual("777");
            return Promise.resolve(expectedSignup.signupId);
          },
        );

      const signupId = await signups.addTeam(
        expectedSignup.scrimId,
        expectedSignup.teamName,
        theheuman,
        [theheuman, zboy, supreme],
      );
      expect(signupId).toEqual(expectedSignup.signupId);
      expect.assertions(7);
    });
  });

  describe("updateActiveScrims()", () => {
    it("Should get active scrims", async () => {
      cache.clear();
      jest.spyOn(dbMock, "getActiveScrims").mockImplementation(() => {
        return Promise.resolve({
          scrims: [
            {
              id: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
              discord_channel: "something",
              date_time_field: "2024-10-14T20:10:35.706+00:00",
            },
          ],
        });
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
          (
            dateTime: Date,
            discordChannelID: string,
            skill?: number | null,
            overstatLink?: string | null,
          ) => {
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
        .mockImplementation((dbScrimId: string) => {
          expect(dbScrimId).toEqual(scrimId);
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
