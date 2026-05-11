import {
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  Message,
  MessagePayload,
  User,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { CustomInteraction } from "../../../src/commands/interaction";
import { LinkOverstatCommand } from "../../../src/commands/overstat/link-overstat";
import { OverstatService } from "../../../src/services/overstat";
import { AuthService } from "../../../src/services/auth";
import { AlertService } from "../../../src/services/alert";
import { provideMagickalMock } from "../../mocks/magickal-mock";

describe("Link overstat", () => {
  let basicInteraction: CustomInteraction;

  let linkOverstatSpy: SpyInstance<
    Promise<string>,
    [user: User, overstatLink: string],
    string
  >;
  let editReplySpy: SpyInstance<
    Promise<Message<boolean>>,
    [reply: string | InteractionEditReplyOptions | MessagePayload],
    string
  >;
  let followUpSpy: SpyInstance<
    Promise<Message<boolean>>,
    [reply: string | InteractionReplyOptions | MessagePayload],
    string
  >;

  const mockAuthService = provideMagickalMock(AuthService);
  const mockOverstatService = provideMagickalMock(OverstatService);

  let command: LinkOverstatCommand;

  beforeAll(() => {
    command = new LinkOverstatCommand(
      provideMagickalMock(AlertService),
      mockAuthService,
      mockOverstatService,
    );

    basicInteraction = {
      options: {
        getUser: () => null,
        getString: () => "overstat link",
      },
      user: { id: "discord command user id" },
      member: { id: "discord member id" },
      editReply: jest.fn(),
      deferReply: jest.fn(),
      followUp: jest.fn(),
      deleteReply: jest.fn(),
    } as unknown as CustomInteraction;
  });

  beforeEach(() => {
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    editReplySpy.mockClear();
    followUpSpy = jest.spyOn(basicInteraction, "followUp");
    followUpSpy.mockClear();
    linkOverstatSpy = jest.spyOn(mockOverstatService, "addPlayerOverstatLink");
    linkOverstatSpy.mockClear();
    jest
      .spyOn(mockAuthService, "memberIsAdmin")
      .mockImplementation((member) =>
        Promise.resolve(member.id === "discord admin id"),
      );
  });

  it("Should add overstat id to normal member", async () => {
    linkOverstatSpy.mockReturnValueOnce(Promise.resolve("db id"));
    await command.run(basicInteraction);
    expect(linkOverstatSpy).toHaveBeenCalledWith(
      { id: "discord command user id" },
      "overstat link",
    );
    expect(followUpSpy).toHaveBeenCalledWith(
      "<@discord command user id>'s overstat set to overstat link",
    );
  });

  it("Should add overstat id to a member when admin using command", async () => {
    const adminInteraction = {
      options: {
        getUser: () => ({
          id: "discord getUser id",
          displayName: "display name",
        }),
        getString: () => "overstat link",
      },
      user: { id: "discord command user id" },
      member: { id: "discord admin id" },
      deferReply: jest.fn(),
      editReply: jest.fn(),
      followUp: jest.fn(),
      deleteReply: jest.fn(),
    } as unknown as CustomInteraction;

    followUpSpy = jest.spyOn(adminInteraction, "followUp");
    followUpSpy.mockClear();
    linkOverstatSpy.mockReturnValueOnce(Promise.resolve("db id"));
    await command.run(adminInteraction);
    expect(linkOverstatSpy).toHaveBeenCalledWith(
      { id: "discord getUser id", displayName: "display name" },
      "overstat link",
    );
    expect(followUpSpy).toHaveBeenCalledWith(
      "<@discord getUser id>'s overstat set to overstat link",
    );
  });

  describe("Errors", () => {
    it("Should reply with an error if overstat service fails", async () => {
      linkOverstatSpy.mockImplementationOnce(() => {
        throw Error("The database fell asleep");
      });

      await command.run(basicInteraction);
      expect(followUpSpy).toHaveBeenCalledWith({
        content: "Overstat not linked. Error: The database fell asleep",
        ephemeral: true,
      });
    });

    it("Should reply with an error if normal member tries to link someone else", async () => {
      const memberInteraction = {
        options: {
          getUser: () => ({
            id: "discord getUser id",
            displayName: "display name",
          }),
          getString: () => "overstat link",
        },
        user: { id: "discord command user id" },
        member: { id: "discord member id" },
        deferReply: jest.fn(),
        followUp: jest.fn(),
        deleteReply: jest.fn(),
      } as unknown as CustomInteraction;
      const memberFollowUpSpy = jest.spyOn(memberInteraction, "followUp");
      await command.run(memberInteraction);
      expect(memberFollowUpSpy).toHaveBeenCalledWith({
        content:
          "Admin permissions not found for this user. You may only run this command for yourself.",
        ephemeral: true,
      });
    });
  });
});
