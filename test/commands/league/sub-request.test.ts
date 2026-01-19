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
import { LeagueSubRequestCommand } from "../../../src/commands/league/sub-request";
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

describe("Sub request", () => {
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
  let getPlayerOverstatSpy: SpyInstance<Promise<string>, [user: User], string>;
  let googleSheetsSpy: SpyInstance;

  let command: LeagueSubRequestCommand;

  const signupMember = {
    displayName: "Signup User",
    id: "player1id",
    roles: {},
  } as GuildMember;

  const playerOut = {
    displayName: "Player 1",
    id: "player1id",
  } as User;

  const playerIn = {
    displayName: "Player 2",
    id: "player2id",
  } as User;

  let mockOverstatService: OverstatService;

  beforeAll(() => {
    mockOverstatService = new OverstatServiceMock() as OverstatService;
    const staticCommandUsedJustForInputNames = new LeagueSubRequestCommand(
      mockOverstatService,
    );
    basicInteraction = {
      channelId: "forum thread id",
      invisibleReply: jest.fn(),
      deferReply: jest.fn(),
      followUp: jest.fn(),
      options: {
        getUser: (key: string) => {
          if (key === "player-out") {
            return playerOut;
          } else if (key === "player-in") {
            return playerIn;
          } else {
            return null;
          }
        },
        getString: (key: string) => {
          if (key === staticCommandUsedJustForInputNames.inputNames.teamName) {
            return "Dude Cube";
          } else if (
            key ===
            staticCommandUsedJustForInputNames.inputNames.playerInInputNames
              .overstatLink
          ) {
            return overstats.player2;
          } else if (
            key ===
            staticCommandUsedJustForInputNames.inputNames.additionalComments
          ) {
            return "None";
          } else {
            return null;
          }
        },
        getChoice: (key: string) => {
          if (
            key === staticCommandUsedJustForInputNames.inputNames.teamDivision
          ) {
            return 4;
          } else if (
            key === staticCommandUsedJustForInputNames.inputNames.weekNumber
          ) {
            return 0;
          } else {
            return null;
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
    getPlayerOverstatSpy = jest.spyOn(mockOverstatService, "getPlayerOverstat");
    getPlayerOverstatSpy.mockImplementation((user) =>
      user.id === playerOut.id
        ? Promise.resolve(overstats.player1)
        : Promise.resolve(overstats.player2),
    );
  });

  beforeEach(() => {
    followUpSpy.mockClear();
    googleSheetsRequestSpy.mockClear();
    invisibleReplySpy.mockClear();
    command = new LeagueSubRequestCommand(mockOverstatService);
  });

  it("Should make the sub request", async () => {
    const date = new Date("2025-12-26T18:55:23.264Z");
    jest.useFakeTimers();
    jest.setSystemTime(date);
    await command.run(basicInteraction);
    expect(googleSheetsRequestSpy).toHaveBeenCalledWith({
      auth: undefined,
      range: "Sub Requests!A1",
      requestBody: {
        values: [
          [
            date.toISOString(),
            "Division4",
            "Dude Cube",
            "PlacementDay1",
            playerOut.displayName,
            playerOut.id,
            overstats.player1,
            playerIn.displayName,
            playerIn.id,
            overstats.player2,
            signupMember.displayName,
            signupMember.id,
            "None",
          ],
        ],
      },
      spreadsheetId: "1pp8ynvVj9Z1yuuNhy8C2QvyflYhWhAQC3BQD_OJXkn4",
      valueInputOption: "USER_ENTERED",
    });
    expect(followUpSpy).toHaveBeenCalledWith(
      `Sub requested for __Dude Cube__\nSubbing out <@player1id>\nSubbing in <@player2id>\nRequested week: PlacementDay1\nSheet row #0`,
    );
    jest.useRealTimers();
  });

  it("Should complete signup but warn that response can't be parsed", async () => {
    const localGoogleValueMethods = {
      append: (
        request: Params$Resource$Spreadsheets$Values$Append,
      ): Promise<GaxiosResponseWithHTTP2<Readable>> =>
        Promise.resolve({
          data: {
            updates: {
              updatedRange: "weird unparseable string",
            },
            request: "Request data " + request.key,
          },
        } as GaxiosResponseWithHTTP2),
    };
    googleSheetsSpy.mockReturnValueOnce({
      spreadsheets: {
        values: localGoogleValueMethods,
      } as unknown as Resource$Spreadsheets,
    } as Sheets);
    const localGoogleRequestSpy = jest.spyOn(localGoogleValueMethods, "append");

    await command.run(basicInteraction);
    // re initialize request spy to spy on the local append method
    expect(localGoogleRequestSpy).toHaveBeenCalled();
    expect(followUpSpy).toHaveBeenCalledWith(
      `Problem parsing google sheets response, please check sheet to see if your sub request went through before resubmitting`,
    );
  });

  describe("errors", () => {
    it("should not complete the signup because google did a bad", async () => {
      googleSheetsRequestSpy.mockImplementationOnce(async () => {
        throw Error("Sheets Failure");
      });
      await command.run(basicInteraction);
      expect(followUpSpy).toHaveBeenCalledWith(
        "Sub request not made. Error: Sheets Failure",
      );
    });

    it("should not complete the signup because the overstat is not valid", async () => {
      jest
        .spyOn(mockOverstatService, "validateLinkUrl")
        .mockImplementationOnce(() => {
          throw Error("Not a link to a player overview.");
        });
      await command.run(basicInteraction);
      expect(invisibleReplySpy).toHaveBeenCalledWith(
        `Sub request not valid. Overstat link provided for player subbing in is not valid.\nError: Not a link to a player overview.`,
      );
    });

    it("should not complete the signup because the player being subbed out doesn't have an overstat", async () => {
      getPlayerOverstatSpy.mockImplementationOnce(() => {
        throw Error("Rejected get player overstat promise");
      });
      await command.run(basicInteraction);
      expect(invisibleReplySpy).toHaveBeenCalledWith(
        `Could not find overstat of the player being subbed out in the db. Please have them link it with the /link-overstat command.\nThis may have happened if you had an admin edit your signup players in a ticket.\nError: Rejected get player overstat promise`,
      );
    });
  });

  const overstats = {
    player1: getPlayerOverstatUrl("1"),
    player2: getPlayerOverstatUrl("2"),
  };
});
