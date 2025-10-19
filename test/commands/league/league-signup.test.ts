import {
  GuildMember,
  InteractionReplyOptions,
  Message,
  MessagePayload,
  User,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { CustomInteraction } from "../../../src/commands/interaction";
import { LeagueSignupCommand } from "../../../src/commands/league/league-signup";
import { sheets } from "@googleapis/sheets";
import { GaxiosResponseWithHTTP2 } from "googleapis-common";
import { Readable } from "stream";
import { OverstatServiceMock } from "../../mocks/overstat.mock";
import { OverstatService } from "../../../src/services/overstat";

describe("Sign up", () => {
  let basicInteraction: CustomInteraction;
  let followUpSpy: SpyInstance<
    Promise<Message<boolean>>,
    [reply: string | InteractionReplyOptions | MessagePayload],
    string
  >;
  let googleSheetsRequestSpy: SpyInstance<
    Promise<GaxiosResponseWithHTTP2<Readable>>,
    [request: unknown],
    string
  >;

  let command: LeagueSignupCommand;

  const signupMember = {
    displayName: "Signup User",
    id: "signupPlayerId",
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

  const signupPlayers = [player1, player2, player3];
  let mockOverstatService: OverstatService;

  beforeAll(() => {
    const staticCommandUsedJustForInputNames = new LeagueSignupCommand(
      mockOverstatService,
    );
    basicInteraction = {
      channelId: "forum thread id",
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
          } else {
            getPlayerOverstat(key);
          }
        },
        getInteger: (key: string) => {
          if (
            key === staticCommandUsedJustForInputNames.inputNames.compExperience
          ) {
            return 4;
          } else {
            getPlayerIntegerInputs(key);
          }
        },
      },
      member: signupMember,
    } as unknown as CustomInteraction;
    followUpSpy = jest.spyOn(basicInteraction, "followUp");
    googleSheetsRequestSpy = jest.spyOn(
      sheets("v4").spreadsheets.values,
      "append",
    ) as unknown as SpyInstance<
      Promise<GaxiosResponseWithHTTP2<Readable>>,
      [request: unknown],
      string
    >;
    // TODO mock google auth
  });

  beforeEach(() => {
    mockOverstatService = new OverstatServiceMock() as OverstatService;
    followUpSpy.mockClear();
    googleSheetsRequestSpy.mockClear();
    command = new LeagueSignupCommand(mockOverstatService);
  });

  it("Should complete signup", async () => {
    await command.run(basicInteraction);
    expect(googleSheetsRequestSpy).toHaveBeenCalledWith({});
    expect(followUpSpy).toHaveBeenCalledWith(
      `team name\n<@player1id>, <@player2id>, <@player3id>\nSigned up by <@signupPlayerId>.\nSignup #5. Your priority based on returning players will be determined by admins manually`,
    );
  });

  describe("errors", () => {
    it("should not complete the signup because google did a bad", async () => {
      googleSheetsRequestSpy.mockImplementationOnce(async () => {
        throw Error("Sheets Failure");
      });
      await command.run(basicInteraction);
      expect(followUpSpy).toHaveBeenCalledWith(
        "Team not signed up. Error: Sheets failure",
      );
    });

    it("should not complete the signup because the overstats are not valid", async () => {
      let getOverstatIdCount = 0;
      jest
        .spyOn(mockOverstatService, "getPlayerId")
        .mockImplementationOnce(() => {
          getOverstatIdCount++;
          if (getOverstatIdCount === 0) {
            throw Error("Not a link to a player overview.");
          } else {
            return "12345";
          }
        });
      await command.run(basicInteraction);
      expect(followUpSpy).toHaveBeenCalledWith(
        `Team not signed up. Error: Player "pgk" has an invalid overstat link: Not a link to a player overview. A valid link looks like this: https://overstat.gg/player/357606/overview`,
      );
    });
  });

  const ranks = {
    player1: 0,
    player2: 1,
    player3: 2,
  };

  const divisions = {
    player1: 0,
    player2: 1,
    player3: 2,
  };

  const platforms = {
    player1: 0,
    player2: 1,
    player3: 2,
  };

  const overstats = {
    player1: "overstat.gg/player1",
    player2: "overstat.gg/player2",
    player3: "overstat.gg/player3",
  };

  const getPlayerIntegerInputs = (key: string) => {
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
      mockOverstatService,
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
      mockOverstatService,
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
      mockOverstatService,
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
      mockOverstatService,
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
