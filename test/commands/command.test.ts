import {
  ChatInputCommandInteraction,
  GuildMember,
  InteractionEditReplyOptions,
  Message,
  MessagePayload,
  User,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { MockAdminCommand, MockMemberCommand } from "../mocks/command.mock";
import { AuthMock } from "../mocks/auth.mock";
import { AuthService } from "../../src/services/auth";

describe("abstract command", () => {
  let basicInteraction: ChatInputCommandInteraction;
  let noMemberInteraction: ChatInputCommandInteraction;
  let unAuthorizedMemberInteraction: ChatInputCommandInteraction;
  const authMock = new AuthMock() as AuthService;

  let runSpy: SpyInstance<
    Promise<void>,
    [interaction: ChatInputCommandInteraction],
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

  it("Should call child class run command because member is authorized", async () => {
    runSpy.mockClear();
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    await adminCommand.execute(basicInteraction);
    expect(runSpy).toHaveBeenCalledWith(basicInteraction);
  });

  it("Should call child class run command because member does not need to be authorized", async () => {
    runSpy = jest.spyOn(memberCommand, "run");
    runSpy.mockClear();
    editReplySpy = jest.spyOn(noMemberInteraction, "editReply");
    await memberCommand.execute(noMemberInteraction);
    expect(runSpy).toHaveBeenCalledWith(noMemberInteraction);
    expect(editReplySpy).not.toHaveBeenCalled();
  });

  describe("errors", () => {
    it("should not call run command because there is no member", async () => {
      runSpy.mockClear();
      editReplySpy = jest.spyOn(noMemberInteraction, "editReply");
      await adminCommand.execute(noMemberInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Can't find the member issuing the command or this is an api command, no command executed",
      );
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
