import {
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  Message,
  MessagePayload,
  User,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { CustomInteraction } from "../../../src/commands/interaction";
import { AuthMock } from "../../mocks/auth.mock";
import { OverstatService } from "../../../src/services/overstat";
import { OverstatServiceMock } from "../../mocks/overstat.mock";
import { AuthService } from "../../../src/services/auth";
import { DbMock } from "../../mocks/db.mock";
import { GetOverstatCommand } from "../../../src/commands/overstat/get-overstat";

describe("Get overstat", () => {
  let basicInteraction: CustomInteraction;

  let getOverstatSpy: SpyInstance<Promise<string>, [user: User], string>;
  let editReplySpy: SpyInstance<
    Promise<Message<boolean>>,
    [reply: string | InteractionEditReplyOptions | MessagePayload],
    string
  >;

  const mockAuthService = new AuthMock();
  const mockOverstatService = new OverstatServiceMock(new DbMock());

  let command: GetOverstatCommand;

  beforeAll(() => {
    command = new GetOverstatCommand(
      mockAuthService as AuthService,
      mockOverstatService as unknown as OverstatService,
    );

    basicInteraction = {
      options: {
        getUser: () => null,
      },
      user: { id: "discord command user id" },
      member: { id: "discord member id" },
      editReply: jest.fn(),
      invisibleReply: jest.fn(),
    } as unknown as CustomInteraction;
  });

  beforeEach(() => {
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    editReplySpy.mockClear();
    getOverstatSpy = jest.spyOn(mockOverstatService, "getPlayerOverstat");
    getOverstatSpy.mockClear();
    jest
      .spyOn(mockAuthService, "memberIsAdmin")
      .mockImplementation((member) =>
        Promise.resolve(member.id === "discord admin id"),
      );
  });

  it("Should get overstat id to normal member", async () => {
    getOverstatSpy.mockReturnValueOnce(Promise.resolve("overstat link"));
    await command.run(basicInteraction);
    expect(getOverstatSpy).toHaveBeenCalledWith({
      id: "discord command user id",
    });
    expect(editReplySpy).toHaveBeenCalledWith(
      "<@discord command user id>'s overstat is overstat link",
    );
  });

  it("Should get overstat id to a member when admin using command", async () => {
    const adminInteraction = {
      options: {
        getUser: () => ({
          id: "discord getUser id",
          displayName: "display name",
        }),
      },
      user: { id: "discord command user id" },
      member: { id: "discord admin id" },
      invisibleReply: jest.fn(),
      editReply: jest.fn(),
    } as unknown as CustomInteraction;

    editReplySpy = jest.spyOn(adminInteraction, "editReply");
    editReplySpy.mockClear();
    getOverstatSpy.mockReturnValueOnce(Promise.resolve("overstat link"));
    await command.run(adminInteraction);
    expect(getOverstatSpy).toHaveBeenCalledWith({
      id: "discord getUser id",
      displayName: "display name",
    });
    expect(editReplySpy).toHaveBeenCalledWith(
      "<@discord getUser id>'s overstat is overstat link",
    );
  });

  describe("Errors", () => {
    it("Should reply with an error if overstat service fails", async () => {
      getOverstatSpy.mockImplementationOnce(() => {
        throw Error("The database fell asleep");
      });

      await command.run(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Could not fetch overstat. Error: The database fell asleep",
      );
    });

    it("Should reply with an error if normal member tries to get link of someone else", async () => {
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
        editReply: jest.fn(),
        invisibleReply: jest.fn(),
      } as unknown as CustomInteraction;
      editReplySpy = jest.spyOn(memberInteraction, "editReply");
      editReplySpy.mockClear();
      await command.run(memberInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Admin permissions not found for this user. You may only run this command for yourself.",
      );
    });
  });
});
