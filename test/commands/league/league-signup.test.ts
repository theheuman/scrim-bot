import {
  GuildMember,
  InteractionReplyOptions,
  InteractionResponse,
  Message,
  MessagePayload,
  User,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { CustomInteraction } from "../../../src/commands/interaction";
import { LeagueSignupCommand } from "../../../src/commands/league/league-signup";
import { LeagueService } from "../../../src/services/league";
import { LeagueServiceMock } from "../../mocks/league.mock";
import {
  getPlayerOverstatUrl,
  OverstatService,
} from "../../../src/services/overstat";
import { OverstatServiceMock } from "../../mocks/overstat.mock";
import { DB } from "../../../src/db/db";
import { AlertService } from "../../../src/services/alert";

describe("Sign up", () => {
  let basicInteraction: CustomInteraction;
  let followUpSpy: SpyInstance<
    Promise<Message<boolean>>,
    [reply: string | InteractionReplyOptions | MessagePayload],
    string
  >;
  let invisibleReplySpy: SpyInstance<
    Promise<InteractionResponse<boolean>>,
    [message: string],
    string
  >;
  let getPlayerOverstatSpy: SpyInstance;
  let signupSpy: SpyInstance;

  let command: LeagueSignupCommand;

  const signupMember = {
    displayName: "Signup User",
    id: "player1id",
    roles: {},
  } as GuildMember;

  const player1 = {
    displayName: "Player 1",
    id: "player1id",
  } as User;

  const player2 = {
    displayName: "Player 2",
    id: "player2id",
  } as User;

  const player3 = {
    displayName: "Player 3",
    id: "player3id",
  } as User;

  let mockOverstatService: OverstatService;
  let mockLeagueService: LeagueService;

  beforeAll(() => {
    mockOverstatService = new OverstatServiceMock() as OverstatService;
    mockLeagueService = new LeagueServiceMock() as unknown as LeagueService;
    const staticCommandUsedJustForInputNames = new LeagueSignupCommand(
      { warn: jest.fn(), error: jest.fn() } as unknown as AlertService,
      mockOverstatService,
      mockLeagueService,
    );
    basicInteraction = {
      channelId: "forum thread id",
      invisibleReply: jest.fn(),
      deferReply: jest.fn(),
      followUp: jest.fn(),
      options: {
        getUser: (key: string) => {
          if (key === "player1") {
            return player1;
          } else if (key === "player2") {
            return player2;
          } else {
            return player3;
          }
        },
        getString: (key: string) => {
          if (key === staticCommandUsedJustForInputNames.inputNames.teamName) {
            return "team name";
          } else if (
            key ===
            staticCommandUsedJustForInputNames.inputNames.daysUnableToPlay
          ) {
            return "Mondays";
          } else if (
            key === staticCommandUsedJustForInputNames.inputNames.comments
          ) {
            return "Additional comments provided by the user";
          } else if (
            key === staticCommandUsedJustForInputNames.inputNames.compExperience
          ) {
            return "2 days a week, 2 years, EEC";
          } else {
            return getPlayerOverstat(key);
          }
        },
        getChoice: (key: string) => {
          return getPlayerChoiceInputs(key);
        },
      },
      member: signupMember,
    } as unknown as CustomInteraction;
    followUpSpy = jest.spyOn(basicInteraction, "followUp");
    invisibleReplySpy = jest.spyOn(basicInteraction, "invisibleReply");
    signupSpy = jest.spyOn(mockLeagueService, "signup").mockResolvedValue({
      rowNumber: 0,
      seasonInfo: {
        signupPrioEndDate: new Date("2026-01-01T00:00:00Z").toISOString(),
        startDate: new Date("2026-02-01T00:00:00Z").toISOString(),
      },
    });

    jest
      .spyOn(mockOverstatService, "getPlayerId")
      .mockImplementation((overstatLink) => {
        return new OverstatService(undefined as unknown as DB).getPlayerId(
          overstatLink,
        );
      });
  });

  beforeEach(() => {
    command = new LeagueSignupCommand(
      { warn: jest.fn(), error: jest.fn() } as unknown as AlertService,
      mockOverstatService,
      mockLeagueService,
    );
    getPlayerOverstatSpy = jest
      .spyOn(mockOverstatService, "getPlayerOverstat")
      .mockImplementation(() => {
        throw Error("Rejected get player overstat promise");
      });
    followUpSpy.mockClear();
    invisibleReplySpy.mockClear();
    getPlayerOverstatSpy.mockClear();
    signupSpy.mockClear();
  });

  it("Should complete signup", async () => {
    const date = new Date("2025-12-26T18:55:23.264Z");
    jest.useFakeTimers();
    jest.setSystemTime(date);
    await command.run(basicInteraction);
    expect(signupSpy).toHaveBeenCalledWith(
      "team name",
      "Mondays",
      "2 days a week, 2 years, EEC",
      {
        elo: undefined,
        platform: platforms.player1,
        name: player1.displayName,
        discordId: player1.id,
        rank: ranks.player1,
        overstatLink: overstats.player1,
        previous_season_vesa_division: divisions.player1,
      },
      {
        elo: undefined,
        platform: platforms.player2,
        name: player2.displayName,
        discordId: player2.id,
        rank: ranks.player2,
        overstatLink: overstats.player2,
        previous_season_vesa_division: divisions.player2,
      },
      {
        elo: undefined,
        platform: platforms.player3,
        name: player3.displayName,
        discordId: player3.id,
        rank: ranks.player3,
        overstatLink: undefined,
        previous_season_vesa_division: divisions.player3,
      },
      "Additional comments provided by the user",
    );
    expect(followUpSpy).toHaveBeenCalledWith(
      `__team name__\nSigned up by: <@player1id>.\nPlayers: <@player1id>, <@player2id>, <@player3id>.\nSignup #0. Your priority based on returning players will be determined by admins manually`,
    );
    jest.useRealTimers();
  });

  it("Should complete signup with db filled overstat", async () => {
    let getCount = 0;
    getPlayerOverstatSpy.mockImplementation(() => {
      // mock implementation so that the link from the db matches the link provided by the userspy
      getCount++;
      if (getCount === 1) {
        return Promise.resolve(overstats.player1);
      } else if (getCount === 2) {
        return Promise.resolve(overstats.player2);
      } else {
        return Promise.resolve("overstat from db");
      }
    });
    const date = new Date("2025-12-26T18:55:23.264Z");
    jest.useFakeTimers();
    jest.setSystemTime(date);
    await command.run(basicInteraction);
    expect(signupSpy).toHaveBeenCalledWith(
      "team name",
      "Mondays",
      "2 days a week, 2 years, EEC",
      {
        elo: undefined,
        platform: platforms.player1,
        name: player1.displayName,
        discordId: player1.id,
        rank: ranks.player1,
        overstatLink: overstats.player1,
        previous_season_vesa_division: divisions.player1,
      },
      {
        elo: undefined,
        platform: platforms.player2,
        name: player2.displayName,
        discordId: player2.id,
        rank: ranks.player2,
        overstatLink: overstats.player2,
        previous_season_vesa_division: divisions.player2,
      },
      {
        elo: undefined,
        platform: platforms.player3,
        name: player3.displayName,
        discordId: player3.id,
        rank: ranks.player3,
        overstatLink: "overstat from db",
        previous_season_vesa_division: divisions.player3,
      },
      "Additional comments provided by the user",
    );
    expect(followUpSpy).toHaveBeenCalledWith(
      `__team name__\nSigned up by: <@player1id>.\nPlayers: <@player1id>, <@player2id>, <@player3id>.\nSignup #0. Your priority based on returning players will be determined by admins manually`,
    );
    jest.useRealTimers();
  });

  it("Should complete signup but warn that response can't be parsed", async () => {
    signupSpy.mockResolvedValueOnce(null);

    await command.run(basicInteraction);

    expect(signupSpy).toHaveBeenCalled();
    expect(followUpSpy).toHaveBeenCalledWith(
      `Problem parsing google sheets response, please check sheet to see if your signup went through before resubmitting`,
    );
  });

  it("Should complete signup and warn that season is ongoing", async () => {
    signupSpy.mockResolvedValueOnce({
      rowNumber: 0,
      seasonInfo: {
        signupPrioEndDate: new Date("2025-10-01T00:00:00Z").toISOString(),
        startDate: new Date("2025-11-01T00:00:00Z").toISOString(),
      },
    });
    const date = new Date("2025-12-26T18:55:23.264Z");
    jest.useFakeTimers();
    jest.setSystemTime(date);

    await command.run(basicInteraction);
    expect(followUpSpy).toHaveBeenCalledWith(
      `__team name__\nSigned up by: <@player1id>.\nPlayers: <@player1id>, <@player2id>, <@player3id>.\nSignup #0. Your priority based on returning players will be determined by admins manually\nThe season is already ongoing, the team will be placed on the waitlist to fill in for teams that drop out.`,
    );
    jest.useRealTimers();
  });

  it("Should complete signup and warn about priority date", async () => {
    signupSpy.mockResolvedValueOnce({
      rowNumber: 0,
      seasonInfo: {
        signupPrioEndDate: new Date("2025-11-01T00:00:00Z").toISOString(),
        startDate: new Date("2026-01-01T00:00:00Z").toISOString(),
      },
    });
    const date = new Date("2025-12-26T18:55:23.264Z");
    jest.useFakeTimers();
    jest.setSystemTime(date);

    await command.run(basicInteraction);
    expect(followUpSpy).toHaveBeenCalledWith(
      `__team name__\nSigned up by: <@player1id>.\nPlayers: <@player1id>, <@player2id>, <@player3id>.\nSignup #0. Your priority based on returning players will be determined by admins manually\nSignup occurred after the priority window ended.`,
    );
    jest.useRealTimers();
  });

  describe("errors", () => {
    it("should not complete the signup because command initiator is not on the team", async () => {
      basicInteraction.member = {
        displayName: "Signup User",
        id: "a different id",
        roles: {},
      } as GuildMember;
      await command.run(basicInteraction);
      expect(invisibleReplySpy).toHaveBeenCalledWith(
        "Team not signed up. User signing team up must be a player on the team",
      );

      // reset interaction member cause I don't feel like moving its definition to the before each
      basicInteraction.member = signupMember;
    });

    it("should not complete the signup because google did a bad", async () => {
      signupSpy.mockRejectedValueOnce(new Error("Sheets Failure"));
      await command.run(basicInteraction);
      expect(followUpSpy).toHaveBeenCalledWith(
        "Team not signed up. Error: Sheets Failure",
      );
    });

    it("should not complete the signup because the overstats are not valid", async () => {
      jest
        .spyOn(mockOverstatService, "validateLinkUrl")
        .mockImplementationOnce(() => {
          throw Error("Not a link to a player overview.");
        });
      await command.run(basicInteraction);
      expect(invisibleReplySpy).toHaveBeenCalledWith(
        `Team not signed up. One or more of the overstat links provided are not valid. Write "None" if the player does not have one.\nError: Not a link to a player overview.`,
      );
    });

    it("should not complete the signup because the no active league season", async () => {
      signupSpy.mockRejectedValueOnce(
        new Error("No season found with active signups."),
      );
      await command.run(basicInteraction);
      expect(followUpSpy).toHaveBeenCalledWith(
        `Team not signed up. Error: No season found with active signups.`,
      );
    });

    it("Should not complete signup since overstat link is not valid", async () => {
      getPlayerOverstatSpy.mockReturnValue(
        Promise.resolve(getPlayerOverstatUrl("123")),
      );
      await command.run(basicInteraction);
      expect(invisibleReplySpy).toHaveBeenCalledWith(
        `Team not signed up. One or more of the overstat links provided are not valid. Write "None" if the player does not have one.\nError: Overstat provided for ${player1.displayName} does not match link previously provided with /link-overstat command`,
      );
      jest.useRealTimers();
    });
  });

  const ranks = {
    player1: 0,
    player2: 1,
    player3: 2,
  };

  const divisions = {
    player1: 1,
    player2: 2,
    player3: 0,
  };

  const platforms = {
    player1: 0,
    player2: 1,
    player3: 2,
  };

  const overstats = {
    player1: getPlayerOverstatUrl("1"),
    player2: getPlayerOverstatUrl("2"),
    player3: "None",
  };

  const getPlayerChoiceInputs = (key: string) => {
    if (key.includes("rank")) {
      return getPlayerRank(key);
    } else if (key.includes("div")) {
      return getPlayerDivision(key);
    } else {
      return getPlayerPlatform(key);
    }
  };

  const getPlayerRank = (key: string) => {
    const staticCommandUsedJustForInputNames = new LeagueSignupCommand(
      { warn: jest.fn(), error: jest.fn() } as unknown as AlertService,
      mockOverstatService,
      new LeagueServiceMock() as unknown as LeagueService,
    );
    if (
      key ===
      staticCommandUsedJustForInputNames.inputNames.player1inputNames.rank
    ) {
      return ranks.player1;
    } else if (
      key ===
      staticCommandUsedJustForInputNames.inputNames.player2inputNames.rank
    ) {
      return ranks.player2;
    } else if (
      key ===
      staticCommandUsedJustForInputNames.inputNames.player3inputNames.rank
    ) {
      return ranks.player3;
    } else {
      throw Error(
        "Test Error: Trying to get player rank that doesn't match input names",
      );
    }
  };

  const getPlayerDivision = (key: string) => {
    const staticCommandUsedJustForInputNames = new LeagueSignupCommand(
      { warn: jest.fn(), error: jest.fn() } as unknown as AlertService,
      mockOverstatService,
      new LeagueServiceMock() as unknown as LeagueService,
    );
    if (
      key ===
      staticCommandUsedJustForInputNames.inputNames.player1inputNames
        .lastSeasonDivision
    ) {
      return divisions.player1;
    } else if (
      key ===
      staticCommandUsedJustForInputNames.inputNames.player2inputNames
        .lastSeasonDivision
    ) {
      return divisions.player2;
    } else if (
      key ===
      staticCommandUsedJustForInputNames.inputNames.player3inputNames
        .lastSeasonDivision
    ) {
      return divisions.player3;
    } else {
      throw Error(
        "Test error: Trying to get player division that doesn't match input names",
      );
    }
  };

  const getPlayerOverstat = (key: string) => {
    const staticCommandUsedJustForInputNames = new LeagueSignupCommand(
      { warn: jest.fn(), error: jest.fn() } as unknown as AlertService,
      mockOverstatService,
      new LeagueServiceMock() as unknown as LeagueService,
    );
    if (
      key ===
      staticCommandUsedJustForInputNames.inputNames.player1inputNames
        .overstatLink
    ) {
      return overstats.player1;
    } else if (
      key ===
      staticCommandUsedJustForInputNames.inputNames.player2inputNames
        .overstatLink
    ) {
      return overstats.player2;
    } else if (
      key ===
      staticCommandUsedJustForInputNames.inputNames.player3inputNames
        .overstatLink
    ) {
      return overstats.player3;
    } else {
      throw Error(
        "Test error: Trying to get player overstatLink that doesn't match input names",
      );
    }
  };

  const getPlayerPlatform = (key: string) => {
    const staticCommandUsedJustForInputNames = new LeagueSignupCommand(
      { warn: jest.fn(), error: jest.fn() } as unknown as AlertService,
      mockOverstatService,
      new LeagueServiceMock() as unknown as LeagueService,
    );
    if (
      key ===
      staticCommandUsedJustForInputNames.inputNames.player1inputNames.platform
    ) {
      return platforms.player1;
    } else if (
      key ===
      staticCommandUsedJustForInputNames.inputNames.player2inputNames.platform
    ) {
      return platforms.player2;
    } else if (
      key ===
      staticCommandUsedJustForInputNames.inputNames.player3inputNames.platform
    ) {
      return platforms.player3;
    } else {
      throw Error(
        "Test error: Trying to get player platform that doesn't match input names",
      );
    }
  };
});
