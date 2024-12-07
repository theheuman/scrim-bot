import { DbMock } from "../mocks/db.mock";
import { Player } from "../../src/models/Player";
import { GuildMember, User } from "discord.js";
import { CacheService } from "../../src/services/cache";
import { RosterService } from "../../src/services/rosters";
import { ScrimSignup, Scrim } from "../../src/models/Scrims";
import { AuthService } from "../../src/services/auth";

describe("Rosters", () => {
  let dbMock: DbMock;
  let cache: CacheService;
  let rosters: RosterService;
  let authService: AuthService;

  beforeEach(() => {
    dbMock = new DbMock();
    cache = new CacheService();
    authService = new AuthService(dbMock, cache);
    rosters = new RosterService(dbMock, cache, authService);
    jest
      .spyOn(authService, "memberIsAdmin")
      .mockReturnValue(Promise.resolve(true));
  });

  const zboy: { user: User; member: GuildMember; player: Player } = {
    user: { id: "0", displayName: "Zboy" } as User,
    member: { id: "0" } as GuildMember,
    player: { discordId: "0", id: "1987254", displayName: "Zboy" },
  };
  const theheuman: { user: User; member: GuildMember; player: Player } = {
    user: { id: "1", displayName: "TheHeuman" } as User,
    member: { id: "1" } as GuildMember,
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

  const getFineapples = (): ScrimSignup => ({
    teamName: "Fineapples",
    players: [revy, theheuman.player, cTreazy],
    signupId: "213",
    signupPlayer: zboy.player,
    date: new Date(),
  });

  describe("removeSignup()", () => {
    it("Should remove a team", async () => {
      const scrim: Scrim = {
        id: "231478",
        dateTime: new Date("2024-10-14T20:10:35.706+00:00"),
        active: true,
        discordChannel: "",
      };
      const discordChannel = "034528";

      cache.createScrim(discordChannel, scrim);
      cache.setSignups(scrim.id, [getFineapples()]);
      const dbSpy = jest.spyOn(dbMock, "removeScrimSignup");

      await rosters.removeSignup(
        zboy.member,
        discordChannel,
        getFineapples().teamName,
      );
      expect(dbSpy).toHaveBeenCalledWith("Fineapples", scrim.id);
      expect(cache.getSignups(scrim.id)).toEqual([]);
    });

    it("Should not remove a team because there is no scrim with that id", async () => {
      const causeException = async () => {
        await rosters.removeSignup(
          zboy.member,
          "034528",
          getFineapples().teamName,
        );
      };

      cache.clear();

      await expect(causeException).rejects.toThrow(
        "No scrim id matching that scrim channel present, contact admin",
      );
    });

    it("Should not remove a team because there are no signups", async () => {
      const scrim: Scrim = {
        id: "231478",
        dateTime: new Date("2024-10-14T20:10:35.706+00:00"),
        active: true,
        discordChannel: "",
      };
      const discordChannel = "034528";
      cache.clear();
      cache.createScrim(discordChannel, scrim);
      cache.setSignups(scrim.id, undefined as unknown as ScrimSignup[]);
      const causeException = async () => {
        await rosters.removeSignup(
          zboy.member,
          discordChannel,
          getFineapples().teamName,
        );
      };

      await expect(causeException).rejects.toThrow(
        "No teams signed up for this scrim",
      );
    });

    it("Should not remove a team because there is no team with that name", async () => {
      const scrim: Scrim = {
        id: "231478",
        dateTime: new Date("2024-10-14T20:10:35.706+00:00"),
        active: true,
        discordChannel: "",
      };
      const discordChannel = "034528";
      cache.clear();
      cache.createScrim(discordChannel, scrim);
      cache.setSignups(scrim.id, []);
      const causeException = async () => {
        await rosters.removeSignup(
          zboy.member,
          discordChannel,
          getFineapples().teamName,
        );
      };

      await expect(causeException).rejects.toThrow("No team with that name");
    });

    it("Should not remove a team because user is not authorized", async () => {
      const scrim: Scrim = {
        id: "231478",
        dateTime: new Date("2024-10-14T20:10:35.706+00:00"),
        active: true,
        discordChannel: "",
      };
      const discordChannel = "034528";
      const differentFineapples: ScrimSignup = {
        teamName: "Different Fineapples",
        players: [revy, theheuman.player, cTreazy],
        signupId: "213",
        signupPlayer: theheuman.player,
        date: new Date(),
      };
      cache.clear();
      cache.createScrim(discordChannel, scrim);
      cache.setSignups(scrim.id, [differentFineapples]);
      jest
        .spyOn(authService, "memberIsAdmin")
        .mockReturnValue(Promise.resolve(false));
      const causeException = async () => {
        await rosters.removeSignup(
          zboy.member,
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
      const scrim: Scrim = {
        id: "231478",
        dateTime: new Date("2024-10-14T20:10:35.706+00:00"),
        active: true,
        discordChannel: "",
      };
      const discordChannel = "034528";

      cache.createScrim(discordChannel, scrim);
      cache.setSignups(scrim.id, [getFineapples()]);
      const dbSpy = jest.spyOn(dbMock, "changeTeamNameNoAuth");

      await rosters.changeTeamName(
        zboy.member,
        discordChannel,
        getFineapples().teamName,
        "Dude Cube",
      );
      expect(dbSpy).toHaveBeenCalledWith(scrim.id, "Fineapples", "Dude Cube");
      const signups = cache.getSignups(scrim.id) ?? [];
      expect(signups[0]?.teamName).toEqual("Dude Cube");
    });

    it("Should not change team name because team name already taken", async () => {
      const scrim: Scrim = {
        id: "231478",
        dateTime: new Date("2024-10-14T20:10:35.706+00:00"),
        active: true,
        discordChannel: "",
      };
      const discordChannel = "034528";
      const dudeCube: ScrimSignup = {
        teamName: "Dude Cube",
        players: [revy, theheuman.player, cTreazy],
        signupId: "214",
        signupPlayer: theheuman.player,
        date: new Date(),
      };
      cache.clear();
      cache.createScrim(discordChannel, scrim);
      cache.setSignups(scrim.id, [getFineapples(), dudeCube]);
      const causeException = async () => {
        await rosters.changeTeamName(
          zboy.member,
          discordChannel,
          getFineapples().teamName,
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
      const scrim: Scrim = {
        id: "231478",
        dateTime: new Date("2024-10-14T20:10:35.706+00:00"),
        active: true,
        discordChannel: "",
      };
      const discordChannel = "034528";
      const dudeCube: ScrimSignup = {
        teamName: "Dude Cube",
        players: [revy, theheuman.player, cTreazy],
        signupId: "214",
        signupPlayer: theheuman.player,
        date: new Date(),
      };
      cache.createScrim(discordChannel, scrim);
      cache.setSignups(scrim.id, [dudeCube]);
      const dbSpy = jest.spyOn(dbMock, "replaceTeammateNoAuth");
      jest
        .spyOn(dbMock, "insertPlayerIfNotExists")
        .mockReturnValue(Promise.resolve(zboy.player.id));

      let signups = cache.getSignups(scrim.id) ?? [];
      expect(signups[0]?.players[1].displayName).toEqual(
        theheuman.player.displayName,
      );
      await rosters.replaceTeammate(
        theheuman.member,
        discordChannel,
        dudeCube.teamName,
        theheuman.user,
        zboy.user,
      );
      expect(dbSpy).toHaveBeenCalledWith(
        scrim.id,
        dudeCube.teamName,
        theheuman.player.id,
        zboy.player.id,
      );

      signups = cache.getSignups(scrim.id) ?? [];
      expect(signups[0]?.players[1].displayName).toEqual(
        zboy.player.displayName,
      );
    });

    it("Should not replace teammate because player already on another team", async () => {
      const scrim: Scrim = {
        id: "231478",
        dateTime: new Date("2024-10-14T20:10:35.706+00:00"),
        active: true,
        discordChannel: "",
      };
      const discordChannel = "034528";
      const dudeCube: ScrimSignup = {
        teamName: "Dude Cube",
        players: [zboy.player, supreme, mikey],
        signupId: "214",
        signupPlayer: theheuman.player,
        date: new Date(),
      };
      cache.createScrim(discordChannel, scrim);
      cache.setSignups(scrim.id, [dudeCube, getFineapples()]);
      const dbSpy = jest.spyOn(dbMock, "replaceTeammateNoAuth");
      jest
        .spyOn(dbMock, "insertPlayerIfNotExists")
        .mockReturnValue(Promise.resolve(zboy.player.id));

      const causeException = async () => {
        await rosters.replaceTeammate(
          theheuman.member,
          discordChannel,
          getFineapples().teamName,
          theheuman.user,
          zboy.user,
        );
      };

      let signups = cache.getSignups(scrim.id) ?? [];
      expect(signups[1]?.players[1].displayName).toEqual(
        theheuman.player.displayName,
      );

      await expect(causeException).rejects.toThrow(
        "New player is already on a team in this scrim",
      );

      expect(dbSpy).toHaveBeenCalledTimes(0);
      signups = cache.getSignups(scrim.id) ?? [];
      expect(signups[1]?.players[1].displayName).toEqual(
        theheuman.player.displayName,
      );
    });

    it("Should not replace teammate because player being replaced is not on the team", async () => {
      const scrim: Scrim = {
        id: "231478",
        dateTime: new Date("2024-10-14T20:10:35.706+00:00"),
        active: true,
        discordChannel: "",
      };
      const discordChannel = "034528";
      const dudeCube: ScrimSignup = {
        teamName: "Dude Cube",
        players: [revy, supreme, mikey],
        signupId: "214",
        signupPlayer: theheuman.player,
        date: new Date(),
      };
      cache.clear();
      cache.createScrim(discordChannel, scrim);
      cache.setSignups(scrim.id, [dudeCube]);
      const dbSpy = jest.spyOn(dbMock, "replaceTeammateNoAuth");

      const causeException = async () => {
        await rosters.replaceTeammate(
          theheuman.member,
          discordChannel,
          dudeCube.teamName,
          zboy.user,
          theheuman.user,
        );
      };

      await expect(causeException).rejects.toThrow(
        "Player being replaced is not on this team",
      );

      expect(dbSpy).toHaveBeenCalledTimes(0);
    });
  });
});
