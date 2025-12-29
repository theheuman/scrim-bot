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
import * as GoogleSheets from "@googleapis/sheets";

import { GaxiosResponseWithHTTP2, GoogleAuth } from "googleapis-common";
import { Readable } from "stream";
import { OverstatServiceMock } from "../../mocks/overstat.mock";
import {
  getPlayerOverstatUrl,
  OverstatService,
} from "../../../src/services/overstat";
import Resource$Spreadsheets = GoogleSheets.sheets_v4.Resource$Spreadsheets;
import Sheets = GoogleSheets.sheets_v4.Sheets;
import Params$Resource$Spreadsheets$Values$Append = GoogleSheets.sheets_v4.Params$Resource$Spreadsheets$Values$Append;
import { DB } from "../../../src/db/db";

class MockGoogleAuth {
  getClient() {
    return undefined;
  }
}

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
  let googleSheetsRequestSpy: SpyInstance<
    Promise<GaxiosResponseWithHTTP2<Readable>>,
    [request: Params$Resource$Spreadsheets$Values$Append],
    string
  >;
  let getPlayerOverstatSpy: SpyInstance;
  let googleSheetsSpy: SpyInstance;

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

  let mockOverstatService: OverstatService;

  beforeAll(() => {
    mockOverstatService = new OverstatServiceMock() as OverstatService;
    const staticCommandUsedJustForInputNames = new LeagueSignupCommand(
      mockOverstatService,
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
          } else {
            return getPlayerOverstat(key);
          }
        },
        getChoice: (key: string) => {
          if (
            key === staticCommandUsedJustForInputNames.inputNames.compExperience
          ) {
            return 4;
          } else {
            return getPlayerChoiceInputs(key);
          }
        },
      },
      member: signupMember,
    } as unknown as CustomInteraction;
    followUpSpy = jest.spyOn(basicInteraction, "followUp");
    invisibleReplySpy = jest.spyOn(basicInteraction, "invisibleReply");

    const googleValuesMethods = {
      append: (
        request: Params$Resource$Spreadsheets$Values$Append,
      ): Promise<GaxiosResponseWithHTTP2<Readable>> =>
        Promise.resolve({
          data: {
            updates: {
              updatedRange: "'Discord Submittals'!A1:Y1",
            },
            request: "Request data " + request.key,
          },
        } as GaxiosResponseWithHTTP2),
    };
    googleSheetsRequestSpy = jest.spyOn(googleValuesMethods, "append");
    googleSheetsSpy = jest.spyOn(GoogleSheets, "sheets").mockReturnValue({
      spreadsheets: {
        values: googleValuesMethods,
      } as unknown as Resource$Spreadsheets,
    } as Sheets);
    jest
      .spyOn(GoogleSheets.auth, "GoogleAuth")
      .mockReturnValue(new MockGoogleAuth() as unknown as GoogleAuth);
    jest
      .spyOn(mockOverstatService, "getPlayerId")
      .mockImplementation((overstatLink) => {
        return new OverstatService(undefined as unknown as DB).getPlayerId(
          overstatLink,
        );
      });
  });

  beforeEach(() => {
    followUpSpy.mockClear();
    googleSheetsRequestSpy.mockClear();
    command = new LeagueSignupCommand(mockOverstatService);
    getPlayerOverstatSpy = jest
      .spyOn(mockOverstatService, "getPlayerOverstat")
      .mockImplementation(() => {
        throw Error("Rejected get player overstat promise");
      });
  });

  it("Should complete signup", async () => {
    const date = new Date("2025-12-26T18:55:23.264Z");
    jest.useFakeTimers();
    jest.setSystemTime(date);
    await command.run(basicInteraction);
    expect(googleSheetsRequestSpy).toHaveBeenCalledWith({
      auth: undefined,
      range: "Discord Submittals!A1",
      requestBody: {
        values: [
          [
            date.toISOString(),
            "team name",
            "Mondays",
            "4: Pro",
            player1.displayName,
            player1.id,
            overstats.player1,
            "Division1",
            "Bronze",
            "pc",
            "No elo on record",
            player2.displayName,
            player2.id,
            overstats.player2,
            "Division2",
            "Silver",
            "playstation",
            "No elo on record",
            player3.displayName,
            player3.id,
            "No overstat",
            "No division provided",
            "Gold",
            "xbox",
            "No elo on record",
          ],
        ],
      },
      spreadsheetId: "1pp8ynvVj9Z1yuuNhy8C2QvyflYhWhAQC3BQD_OJXkn4",
      valueInputOption: "USER_ENTERED",
    });
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
    expect(googleSheetsRequestSpy).toHaveBeenCalledWith({
      auth: undefined,
      range: "Discord Submittals!A1",
      requestBody: {
        values: [
          [
            date.toISOString(),
            "team name",
            "Mondays",
            "4: Pro",
            player1.displayName,
            player1.id,
            overstats.player1,
            "Division1",
            "Bronze",
            "pc",
            "No elo on record",
            player2.displayName,
            player2.id,
            overstats.player2,
            "Division2",
            "Silver",
            "playstation",
            "No elo on record",
            player3.displayName,
            player3.id,
            "overstat from db",
            "No division provided",
            "Gold",
            "xbox",
            "No elo on record",
          ],
        ],
      },
      spreadsheetId: "1pp8ynvVj9Z1yuuNhy8C2QvyflYhWhAQC3BQD_OJXkn4",
      valueInputOption: "USER_ENTERED",
    });
    expect(followUpSpy).toHaveBeenCalledWith(
      `__team name__\nSigned up by: <@player1id>.\nPlayers: <@player1id>, <@player2id>, <@player3id>.\nSignup #0. Your priority based on returning players will be determined by admins manually`,
    );
    jest.useRealTimers();
  });

  describe("errors", () => {
    it("should not complete the signup because google did a bad", async () => {
      googleSheetsRequestSpy.mockImplementationOnce(async () => {
        throw Error("Sheets Failure");
      });
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

    it("Should complete signup with db filled overstat", async () => {
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
    player1: 0,
    player2: 1,
    player3: null,
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
