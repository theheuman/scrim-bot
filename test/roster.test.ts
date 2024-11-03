import { ScrimSignup, ScrimSignups } from "../src/services/signups";
import { DbMock } from "./mocks/db.mock";
import { Player, PlayerInsert } from "../src/models/Player";
import { User } from "discord.js";
import { Cache } from "../src/services/cache";
import { RosterService } from "../src/services/rosters";

describe("Rosters", () => {
  let dbMock: DbMock;
  let cache: Cache;
  let rosters: RosterService;

  beforeEach(() => {
    dbMock = new DbMock();
    cache = new Cache();
    rosters = new RosterService(dbMock, cache);
  });

  const zboy: { user: User; player: Player } = {
    user: { id: "0", displayName: "Zboy" } as User,
    player: { discordId: "0", id: "1987254", displayName: "Zboy" },
  };
  const theheuman: { user: User; player: Player } = {
    user: { id: "1", displayName: "TheHeuman" } as User,
    player: { discordId: "1", id: "123", displayName: "TheHeuman" },
  };

  const supreme: Player = { discordId: "2", id: "789", displayName: "Supreme" };
  const revy: Player = {
    discordId: "3",
    id: "4368",
    displayName: "revy2hands",
  };
  const cTreazy: Player = {
    discordId: "4",
    id: "452386",
    displayName: "treazy",
  };
  const mikey: Player = { discordId: "5", id: "32576", displayName: "//baev" };

  const fineapples: ScrimSignup = {
    teamName: "Fineapples",
    players: [revy, theheuman.player, cTreazy],
    signupId: "213",
    signupPlayer: zboy.player,
  };

  describe("removeSignup()", () => {
    it("Should remove a team", async () => {
      const scrimId = "231478";
      const discordChannel = "034528";

      cache.createScrim(discordChannel, scrimId);
      cache.setSignups(scrimId, [fineapples]);
      const dbSpy = jest.spyOn(dbMock, "removeScrimSignup");

      await rosters.removeSignup(
        zboy.user,
        discordChannel,
        fineapples.teamName,
      );
      expect(dbSpy).toHaveBeenCalledWith("Fineapples", scrimId);
      expect(cache.getSignups(scrimId)).toEqual([]);
    });

    it("Should not remove a team because there is no scrim with that id", async () => {
      const causeException = async () => {
        await rosters.removeSignup(zboy.user, "034528", fineapples.teamName);
      };

      cache.clear();

      await expect(causeException).rejects.toThrow(
        "No scrim id matching that scrim channel present, contact admin",
      );
    });

    it("Should not remove a team because there are no signups", async () => {
      const scrimId = "231478";
      const discordChannel = "034528";
      cache.clear();
      cache.createScrim(discordChannel, scrimId);
      cache.setSignups(scrimId, undefined as unknown as ScrimSignup[]);
      const causeException = async () => {
        await rosters.removeSignup(
          zboy.user,
          discordChannel,
          fineapples.teamName,
        );
      };

      await expect(causeException).rejects.toThrow(
        "No teams signed up for this scrim",
      );
    });

    it("Should not remove a team because there is no team with that name", async () => {
      const scrimId = "231478";
      const discordChannel = "034528";
      cache.clear();
      cache.createScrim(discordChannel, scrimId);
      cache.setSignups(scrimId, []);
      const causeException = async () => {
        await rosters.removeSignup(
          zboy.user,
          discordChannel,
          fineapples.teamName,
        );
      };

      await expect(causeException).rejects.toThrow("No team with that name");
    });

    it("Should not remove a team because user is not authorized", async () => {
      const scrimId = "231478";
      const discordChannel = "034528";
      const differentFineapples: ScrimSignup = {
        teamName: "Different Fineapples",
        players: [revy, theheuman.player, cTreazy],
        signupId: "213",
        signupPlayer: theheuman.player,
      };
      cache.clear();
      cache.createScrim(discordChannel, scrimId);
      cache.setSignups(scrimId, [differentFineapples]);
      const causeException = async () => {
        await rosters.removeSignup(
          zboy.user,
          discordChannel,
          differentFineapples.teamName,
        );
      };

      await expect(causeException).rejects.toThrow(
        "User issuing command not authorized to make changes",
      );
    });
  });

  describe("changeTeamName()", () => {
    it("Should change team name", async () => {
      const scrimId = "231478";
      const discordChannel = "034528";

      cache.createScrim(discordChannel, scrimId);
      cache.setSignups(scrimId, [fineapples]);
      const dbSpy = jest.spyOn(dbMock, "changeTeamNameNoAuth");

      await rosters.changeTeamName(
        zboy.user,
        discordChannel,
        fineapples.teamName,
        "Dude Cube",
      );
      expect(dbSpy).toHaveBeenCalledWith(scrimId, "Fineapples", "Dude Cube");
      const signups = cache.getSignups(scrimId) ?? [];
      expect(signups[0]?.teamName).toEqual("Dude Cube");
    });

    it("Should not change team name because team name already taken", async () => {
      const scrimId = "231478";
      const discordChannel = "034528";
      const dudeCube: ScrimSignup = {
        teamName: "Dude Cube",
        players: [revy, theheuman.player, cTreazy],
        signupId: "214",
        signupPlayer: theheuman.player,
      };
      cache.clear();
      cache.createScrim(discordChannel, scrimId);
      cache.setSignups(scrimId, [fineapples, dudeCube]);
      const causeException = async () => {
        await rosters.changeTeamName(
          zboy.user,
          discordChannel,
          fineapples.teamName,
          dudeCube.teamName,
        );
      };

      await expect(causeException).rejects.toThrow(
        "Team name already taken in this scrim set",
      );
    });
  });

  describe("replaceTeammate()", () => {
    it("Should replace teammate", async () => {
      const scrimId = "231478";
      const discordChannel = "034528";
      const dudeCube: ScrimSignup = {
        teamName: "Dude Cube",
        players: [revy, theheuman.player, cTreazy],
        signupId: "214",
        signupPlayer: theheuman.player,
      };
      cache.createScrim(discordChannel, scrimId);
      cache.setSignups(scrimId, [dudeCube]);
      const dbSpy = jest.spyOn(dbMock, "replaceTeammateNoAuth");
      jest
        .spyOn(dbMock, "insertPlayerIfNotExists")
        .mockReturnValue(Promise.resolve(zboy.player.id));

      let signups = cache.getSignups(scrimId) ?? [];
      expect(signups[0]?.players[1].displayName).toEqual(
        theheuman.player.displayName,
      );
      await rosters.replaceTeammate(
        theheuman.user,
        discordChannel,
        dudeCube.teamName,
        theheuman.user,
        zboy.user,
      );
      expect(dbSpy).toHaveBeenCalledWith(
        scrimId,
        dudeCube.teamName,
        theheuman.player.id,
        zboy.player.id,
      );

      signups = cache.getSignups(scrimId) ?? [];
      expect(signups[0]?.players[1].displayName).toEqual(
        zboy.player.displayName,
      );
    });

    it("Should not replace teammate because player already on another team", async () => {
      const scrimId = "231478";
      const discordChannel = "034528";
      const dudeCube: ScrimSignup = {
        teamName: "Dude Cube",
        players: [zboy.player, supreme, mikey],
        signupId: "214",
        signupPlayer: theheuman.player,
      };
      cache.createScrim(discordChannel, scrimId);
      cache.setSignups(scrimId, [dudeCube, fineapples]);
      const dbSpy = jest.spyOn(dbMock, "replaceTeammateNoAuth");
      jest
        .spyOn(dbMock, "insertPlayerIfNotExists")
        .mockReturnValue(Promise.resolve(zboy.player.id));

      const causeException = async () => {
        await rosters.replaceTeammate(
          theheuman.user,
          discordChannel,
          fineapples.teamName,
          theheuman.user,
          zboy.user,
        );
      };

      let signups = cache.getSignups(scrimId) ?? [];
      expect(signups[1]?.players[1].displayName).toEqual(
        theheuman.player.displayName,
      );

      await expect(causeException).rejects.toThrow(
        "New player is already on a team in this scrim",
      );

      expect(dbSpy).toHaveBeenCalledTimes(0);
      signups = cache.getSignups(scrimId) ?? [];
      expect(signups[1]?.players[1].displayName).toEqual(
        theheuman.player.displayName,
      );
    });
  });
});
