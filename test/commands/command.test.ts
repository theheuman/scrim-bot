import {
  ChatInputCommandInteraction,
  GuildMember,
  InteractionReplyOptions,
  InteractionResponse,
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
  let replySpy: SpyInstance<
    Promise<InteractionResponse<boolean>>,
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
      reply: jest.fn(),
    } as unknown as ChatInputCommandInteraction;
    unAuthorizedMemberInteraction = {
      reply: jest.fn(),
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
    replySpy = jest.spyOn(basicInteraction, "reply");
    await adminCommand.execute(basicInteraction);
    expect(runSpy).toHaveBeenCalledWith(basicInteraction);
  });

  it("Should call child class run command because member does not need to be authorized", async () => {
    runSpy = jest.spyOn(memberCommand, "run");
    runSpy.mockClear();
    replySpy = jest.spyOn(noMemberInteraction, "reply");
    await memberCommand.execute(noMemberInteraction);
    expect(runSpy).toHaveBeenCalledWith(noMemberInteraction);
    expect(replySpy).not.toHaveBeenCalled();
  });

  describe("errors", () => {
    it("should not call run command because there is no member", async () => {
      runSpy.mockClear();
      replySpy = jest.spyOn(noMemberInteraction, "reply");
      await adminCommand.execute(noMemberInteraction);
      expect(replySpy).toHaveBeenCalledWith(
        "Can't find the member issuing the command or this is an api command, no command executed",
      );
      expect(runSpy).not.toHaveBeenCalled();
    });

    it("should not call run command because member is not authorized", async () => {
      runSpy.mockClear();
      replySpy = jest.spyOn(unAuthorizedMemberInteraction, "reply");
      await adminCommand.execute(unAuthorizedMemberInteraction);
      expect(replySpy).toHaveBeenCalledWith(
        "User calling command is not authorized",
      );
      expect(runSpy).not.toHaveBeenCalled();
    });
  });
});
