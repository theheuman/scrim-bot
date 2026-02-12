import { DbMock } from "../mocks/db.mock";
import { Player } from "../../src/models/Player";
import { GuildMember, User } from "discord.js";
import { RosterService } from "../../src/services/rosters";
import { ScrimSignup, Scrim } from "../../src/models/Scrims";
import { AuthService } from "../../src/services/auth";
import { AuthMock } from "../mocks/auth.mock";
import { DiscordServiceMock } from "../mocks/discord-service.mock";
import { DiscordService } from "../../src/services/discord";
import { BanService } from "../../src/services/ban";
import { BanServiceMock } from "../mocks/ban.mock";
import { StaticValueService } from "../../src/services/static-values";
import { StaticValueServiceMock } from "../mocks/static-values.mock";

describe("Rosters", () => {
  let dbMock: DbMock;
  let rosters: RosterService;
  let authService: AuthMock;
  let banServiceMock: BanService;
  let staticValueService: StaticValueService;
  const discordChannel = "034528";
  let getScrimSignupsSpy: jest.SpyInstance;
  let getActiveScrimsSpy: jest.SpyInstance;

  beforeEach(() => {
    dbMock = new DbMock();
    authService = new AuthMock();
    banServiceMock = new BanServiceMock() as BanService;
    staticValueService = new StaticValueServiceMock() as StaticValueService;
    rosters = new RosterService(
      dbMock,
      authService as AuthService,
      new DiscordServiceMock() as DiscordService,
      banServiceMock,
      staticValueService,
    );
    jest
      .spyOn(authService, "memberIsAdmin")
      .mockReturnValue(Promise.resolve(true));

    const scrimReturnValues = generateScrimReturnValues([], []);

    getScrimSignupsSpy = jest.spyOn(dbMock, "getScrimSignupsWithPlayers");
    getScrimSignupsSpy.mockReturnValue(
      Promise.resolve(scrimReturnValues.scrimSignups),
    );
    getActiveScrimsSpy = jest.spyOn(dbMock, "getActiveScrims");
    getActiveScrimsSpy.mockReturnValue(
      Promise.resolve(scrimReturnValues.activeScrims),
    );
  });

  const zboy: { user: User; member: GuildMember; player: Player } = {
    user: { id: "0", displayName: "Zboy" } as User,
    member: { id: "0" } as GuildMember,
    player: {
      discordId: "0",
      id: "1987254",
      displayName: "Zboy",
      overstatId: "1234",
    },
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
        discordChannel,
      };
      const scrimReturnValues = generateScrimReturnValues(
        [getFineapples()],
        [scrim],
      );

      getScrimSignupsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.scrimSignups),
      );
      getActiveScrimsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.activeScrims),
      );

      const dbSpy = jest.spyOn(dbMock, "removeScrimSignup");
      await rosters.removeSignup(
        zboy.member,
        discordChannel,
        getFineapples().teamName,
      );
      expect(dbSpy).toHaveBeenCalledWith("Fineapples", scrim.id);
    });

    it("Should not remove a team because there is no scrim with that id", async () => {
      const scrimReturnValues = generateScrimReturnValues([], []);

      getScrimSignupsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.scrimSignups),
      );
      getActiveScrimsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.activeScrims),
      );

      const causeException = async () => {
        await rosters.removeSignup(
          zboy.member,
          "034528",
          getFineapples().teamName,
        );
      };

      await expect(causeException).rejects.toThrow(
        "No scrim matching that scrim channel present, contact admin",
      );
    });

    it("Should not remove a team because there is no team with that name", async () => {
      const scrim: Scrim = {
        id: "231478",
        dateTime: new Date("2024-10-14T20:10:35.706+00:00"),
        active: true,
        discordChannel,
      };

      const scrimReturnValues = generateScrimReturnValues(
        [getFineapples()],
        [scrim],
      );

      getScrimSignupsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.scrimSignups),
      );
      getActiveScrimsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.activeScrims),
      );
      const causeException = async () => {
        await rosters.removeSignup(
          zboy.member,
          discordChannel,
          "random other name",
        );
      };

      await expect(causeException).rejects.toThrow("No team with that name");
    });

    it("Should not remove a team because user is not authorized", async () => {
      const scrim: Scrim = {
        id: "231478",
        dateTime: new Date("2024-10-14T20:10:35.706+00:00"),
        active: true,
        discordChannel,
      };
      const differentFineapples: ScrimSignup = {
        teamName: "Different Fineapples",
        players: [revy, theheuman.player, cTreazy],
        signupId: "213",
        signupPlayer: theheuman.player,
        date: new Date(),
      };

      const scrimReturnValues = generateScrimReturnValues(
        [differentFineapples],
        [scrim],
      );

      getScrimSignupsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.scrimSignups),
      );
      getActiveScrimsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.activeScrims),
      );

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
        discordChannel,
      };

      const dbSpy = jest.spyOn(dbMock, "changeTeamNameNoAuth");

      const fineapples = getFineapples();
      const scrimReturnValues = generateScrimReturnValues(
        [fineapples],
        [scrim],
      );

      getScrimSignupsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.scrimSignups),
      );
      getActiveScrimsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.activeScrims),
      );

      await rosters.changeTeamName(
        zboy.member,
        discordChannel,
        fineapples.teamName,
        "Dude Cube",
      );
      expect(dbSpy).toHaveBeenCalledWith(scrim.id, "Fineapples", "Dude Cube");
    });

    it("Should not change team name because team name already taken", async () => {
      const scrim: Scrim = {
        id: "231478",
        dateTime: new Date("2024-10-14T20:10:35.706+00:00"),
        active: true,
        discordChannel,
      };
      const dudeCube: ScrimSignup = {
        teamName: "Dude Cube",
        players: [revy, theheuman.player, cTreazy],
        signupId: "214",
        signupPlayer: theheuman.player,
        date: new Date(),
      };

      const fineapples = getFineapples();
      const scrimReturnValues = generateScrimReturnValues(
        [fineapples, dudeCube],
        [scrim],
      );

      getScrimSignupsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.scrimSignups),
      );
      getActiveScrimsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.activeScrims),
      );
      const causeException = async () => {
        await rosters.changeTeamName(
          zboy.member,
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
      const scrim: Scrim = {
        id: "231478",
        dateTime: new Date("2024-10-14T20:10:35.706+00:00"),
        active: true,
        discordChannel,
      };
      const dudeCube: ScrimSignup = {
        teamName: "Dude Cube",
        players: [revy, theheuman.player, cTreazy],
        signupId: "214",
        signupPlayer: theheuman.player,
        date: new Date(),
      };

      const scrimReturnValues = generateScrimReturnValues([dudeCube], [scrim]);

      getScrimSignupsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.scrimSignups),
      );
      getActiveScrimsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.activeScrims),
      );

      const dbSpy = jest.spyOn(dbMock, "replaceTeammateNoAuth");
      jest
        .spyOn(dbMock, "insertPlayerIfNotExists")
        .mockReturnValue(Promise.resolve(zboy.player));

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
    });

    it("Should not replace teammate because player already on another team", async () => {
      const scrim: Scrim = {
        id: "231478",
        dateTime: new Date("2024-10-14T20:10:35.706+00:00"),
        active: true,
        discordChannel,
      };
      const dudeCube: ScrimSignup = {
        teamName: "Dude Cube",
        players: [zboy.player, supreme, mikey],
        signupId: "214",
        signupPlayer: theheuman.player,
        date: new Date(),
      };
      const scrimReturnValues = generateScrimReturnValues(
        [dudeCube, getFineapples()],
        [scrim],
      );

      getScrimSignupsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.scrimSignups),
      );
      getActiveScrimsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.activeScrims),
      );

      const dbSpy = jest.spyOn(dbMock, "replaceTeammateNoAuth");
      jest
        .spyOn(dbMock, "insertPlayerIfNotExists")
        .mockReturnValue(Promise.resolve(zboy.player));

      const causeException = async () => {
        await rosters.replaceTeammate(
          theheuman.member,
          discordChannel,
          getFineapples().teamName,
          theheuman.user,
          zboy.user,
        );
      };

      await expect(causeException).rejects.toThrow(
        "New player is already on a team in this scrim",
      );

      expect(dbSpy).toHaveBeenCalledTimes(0);
    });

    it("Should not replace teammate because player being replaced is not on the team", async () => {
      const scrim: Scrim = {
        id: "231478",
        dateTime: new Date("2024-10-14T20:10:35.706+00:00"),
        active: true,
        discordChannel,
      };
      const dudeCube: ScrimSignup = {
        teamName: "Dude Cube",
        players: [revy, supreme, mikey],
        signupId: "214",
        signupPlayer: theheuman.player,
        date: new Date(),
      };
      const scrimReturnValues = generateScrimReturnValues([dudeCube], [scrim]);

      getScrimSignupsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.scrimSignups),
      );
      getActiveScrimsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.activeScrims),
      );

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

    it("Should not replace teammate because new player does not have an overstat id", async () => {
      jest
        .spyOn(authService, "memberIsAdmin")
        .mockReturnValueOnce(Promise.resolve(false));
      const scrim: Scrim = {
        id: "231478",
        dateTime: new Date("2024-10-14T20:10:35.706+00:00"),
        active: true,
        discordChannel,
      };
      const dudeCube: ScrimSignup = {
        teamName: "Dude Cube",
        players: [zboy.player, supreme, mikey],
        signupId: "214",
        signupPlayer: theheuman.player,
        date: new Date(),
      };
      const scrimReturnValues = generateScrimReturnValues([dudeCube], [scrim]);

      getScrimSignupsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.scrimSignups),
      );
      getActiveScrimsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.activeScrims),
      );

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
        "New player has no overstat set",
      );

      expect(dbSpy).toHaveBeenCalledTimes(0);
    });

    it("Should not replace teammate because new player is scrim banned", async () => {
      jest
        .spyOn(authService, "memberIsAdmin")
        .mockReturnValueOnce(Promise.resolve(true));
      const scrim: Scrim = {
        id: "231478",
        dateTime: new Date("2024-10-14T20:10:35.706+00:00"),
        active: true,
        discordChannel,
      };
      const dudeCube: ScrimSignup = {
        teamName: "Dude Cube",
        players: [theheuman.player, supreme, mikey],
        signupId: "214",
        signupPlayer: theheuman.player,
        date: new Date(),
      };
      jest
        .spyOn(dbMock, "insertPlayerIfNotExists")
        .mockReturnValue(Promise.resolve(zboy.player));

      const scrimReturnValues = generateScrimReturnValues([dudeCube], [scrim]);

      getScrimSignupsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.scrimSignups),
      );
      getActiveScrimsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.activeScrims),
      );
      const dbSpy = jest.spyOn(dbMock, "replaceTeammateNoAuth");
      jest.spyOn(banServiceMock, "teamHasBan").mockReturnValue(
        Promise.resolve({
          hasBan: true,
          reason: "Zboy: A valid reason for scrim ban",
        }),
      );

      const causeException = async () => {
        await rosters.replaceTeammate(
          theheuman.member,
          discordChannel,
          dudeCube.teamName,
          theheuman.user,
          zboy.user,
        );
      };

      await expect(causeException).rejects.toThrow(
        "New player is scrim banned. Zboy: A valid reason for scrim ban",
      );

      expect(dbSpy).toHaveBeenCalledTimes(0);
    });

    it("Should not replace teammate because is is past roster lock date", async () => {
      jest
        .spyOn(authService, "memberIsAdmin")
        .mockReturnValueOnce(Promise.resolve(false));
      const scrim: Scrim = {
        id: "231478",
        dateTime: new Date("2024-10-14T20:10:35.706+00:00"),
        active: true,
        discordChannel,
      };
      const dudeCube: ScrimSignup = {
        teamName: "Dude Cube",
        players: [theheuman.player, supreme, mikey],
        signupId: "214",
        signupPlayer: theheuman.player,
        date: new Date(),
      };
      const scrimReturnValues = generateScrimReturnValues([dudeCube], [scrim]);

      getScrimSignupsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.scrimSignups),
      );
      getActiveScrimsSpy.mockReturnValue(
        Promise.resolve(scrimReturnValues.activeScrims),
      );

      const dbSpy = jest.spyOn(dbMock, "replaceTeammateNoAuth");
      jest.spyOn(banServiceMock, "teamHasBan").mockReturnValue(
        Promise.resolve({
          hasBan: false,
          reason: "",
        }),
      );
      jest
        .spyOn(dbMock, "insertPlayerIfNotExists")
        .mockReturnValue(Promise.resolve(zboy.player));

      const causeException = async () => {
        await rosters.replaceTeammate(
          theheuman.member,
          discordChannel,
          dudeCube.teamName,
          theheuman.user,
          zboy.user,
        );
      };

      await expect(causeException).rejects.toThrow(
        "It is past the roster lock time. Rosters are locked, please create a ticket if you need to sub",
      );

      expect(dbSpy).toHaveBeenCalledTimes(0);
    });
  });
});

const generateScrimReturnValues = (signups: ScrimSignup[], scrims: Scrim[]) => {
  return {
    scrimSignups: signups.map((signup) => ({
      scrim_id: "",
      date_time: signup.date.toISOString(),
      team_name: signup.teamName,
      signup_player_id: signup.signupPlayer.id,
      signup_player_discord_id: signup.signupPlayer.discordId,
      signup_player_display_name: signup.signupPlayer.displayName,
      player_one_id: signup.players[0].id,
      player_one_discord_id: signup.players[0].discordId,
      player_one_display_name: signup.players[0].displayName,
      player_one_overstat_id: "111",
      player_one_elo: 0,
      player_two_id: signup.players[1].id,
      player_two_discord_id: signup.players[1].discordId,
      player_two_display_name: signup.players[1].displayName,
      player_two_overstat_id: "222",
      player_two_elo: 0,
      player_three_id: signup.players[2].id,
      player_three_discord_id: signup.players[2].discordId,
      player_three_display_name: signup.players[2].displayName,
      player_three_overstat_id: "333",
      player_three_elo: 0,
    })),
    activeScrims: scrims.map((scrim) => ({
      id: scrim.id,
      date_time_field: scrim.dateTime.toISOString(),
      active: scrim.active,
      discord_channel: scrim.discordChannel,
    })),
  };
};
