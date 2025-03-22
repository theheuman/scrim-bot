import {
  ChatInputCommandInteraction,
  GuildMember,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  Message,
  MessagePayload,
  User,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { MockAdminCommand, MockMemberCommand } from "../mocks/command.mock";
import { AuthMock } from "../mocks/auth.mock";
import { AuthService } from "../../src/services/auth";
import { CustomInteraction } from "../../src/commands/interaction";

describe("abstract command", () => {
  let basicInteraction: ChatInputCommandInteraction;
  let noMemberInteraction: ChatInputCommandInteraction;
  let unAuthorizedMemberInteraction: ChatInputCommandInteraction;
  const authMock = new AuthMock() as AuthService;

  let runSpy: SpyInstance<
    Promise<void>,
    [interaction: CustomInteraction],
    string
  >;
  let member: GuildMember;
  const theHeuman: User = {
    displayName: "TheHeuman",
    id: "2",
  } as unknown as User;
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

  let adminCommand: MockAdminCommand;
  let memberCommand: MockMemberCommand;

  beforeAll(() => {
    adminCommand = new MockAdminCommand(authMock);
    memberCommand = new MockMemberCommand();

    member = {
      id: "authorized",
      roles: {},
    } as GuildMember;

    basicInteraction = {
      invisibleReply: jest.fn(),
      editReply: jest.fn(),
      reply: jest.fn(),
      options: {},
      member,
    } as unknown as ChatInputCommandInteraction;

    noMemberInteraction = {
      options: {
        getUser: () => theHeuman,
        getString: (key: string) => {
          if (key === "reason") {
            return "Prio reason";
          } else if (key === "amount") {
            return "-400";
          }
        },
      },
      invisibleReply: jest.fn(),
      editReply: jest.fn(),
      reply: jest.fn(),
      followUp: jest.fn(),
    } as unknown as ChatInputCommandInteraction;

    unAuthorizedMemberInteraction = {
      invisibleReply: jest.fn(),
      reply: jest.fn(),
      editReply: jest.fn(),
      options: {},
      member: {
        id: "unauthorized",
        roles: {},
      } as GuildMember,
    } as unknown as ChatInputCommandInteraction;
  });

  beforeEach(() => {
    runSpy = jest.spyOn(adminCommand, "run");

    jest
      .spyOn(authMock, "memberIsAdmin")
      .mockImplementation((member) =>
        Promise.resolve(member.id === "authorized"),
      );
  });

  it("Should call admin command run method", async () => {
    runSpy.mockClear();
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    await adminCommand.execute(basicInteraction);
    expect(runSpy).toHaveBeenCalledWith(
      new CustomInteraction(basicInteraction),
    );
  });

  it("Should call member command run method", async () => {
    runSpy = jest.spyOn(memberCommand, "run");
    runSpy.mockClear();
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    await memberCommand.execute(basicInteraction);
    expect(runSpy).toHaveBeenCalledWith(
      new CustomInteraction(basicInteraction),
    );
    expect(editReplySpy).not.toHaveBeenCalled();
  });

  describe("errors", () => {
    it("should not call run command because there is no member", async () => {
      runSpy.mockClear();
      followUpSpy = jest.spyOn(noMemberInteraction, "followUp");
      await adminCommand.execute(noMemberInteraction);
      expect(followUpSpy).toHaveBeenCalledWith({
        content:
          "Error executing undefined. Error: Interaction not triggered by guild member",
        ephemeral: true,
      });
      expect(runSpy).not.toHaveBeenCalled();
    });

    it("should not call run command because member is not authorized", async () => {
      runSpy.mockClear();
      editReplySpy = jest.spyOn(unAuthorizedMemberInteraction, "editReply");
      await adminCommand.execute(unAuthorizedMemberInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "User calling command is not authorized",
      );
      expect(runSpy).not.toHaveBeenCalled();
    });
  });
});
