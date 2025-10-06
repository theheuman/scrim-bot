import {
  GuildMember,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  InteractionResponse,
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
  let replySpy: SpyInstance<
    Promise<InteractionResponse<boolean>>,
    [reply: string | InteractionReplyOptions | MessagePayload],
    string
  >;
  let editReplySpy: SpyInstance<
    Promise<Message<boolean>>,
    [options: string | InteractionEditReplyOptions | MessagePayload],
    string
  >;
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
    basicInteraction = {
      channelId: "forum thread id",
      reply: jest.fn(),
      invisibleReply: jest.fn(),
      editReply: jest.fn(),
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
        getString: () => "team name",
        getInteger: (key: string) => {
          console.log(key);
          return 2;
        },
      },
      member: signupMember,
    } as unknown as CustomInteraction;
    replySpy = jest.spyOn(basicInteraction, "reply");
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    followUpSpy = jest.spyOn(basicInteraction, "followUp");
    googleSheetsRequestSpy = jest.spyOn(
      sheets("v4").spreadsheets.values,
      "append",
    ) as unknown as SpyInstance<
      Promise<GaxiosResponseWithHTTP2<Readable>>,
      [request: unknown],
      string
    >;
  });

  beforeEach(() => {
    mockOverstatService = new OverstatServiceMock() as OverstatService;
    replySpy.mockClear();
    editReplySpy.mockClear();
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
      editReplySpy = jest.spyOn(basicInteraction, "editReply");
      await command.run(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
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
      editReplySpy = jest.spyOn(basicInteraction, "editReply");
      await command.run(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        `Team not signed up. Error: Player "pgk" has an invalid overstat link: Not a link to a player overview. A valid link looks like this: https://overstat.gg/player/357606/overview`,
      );
    });
  });
});
