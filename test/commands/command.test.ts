import {
  ChatInputCommandInteraction,
  GuildMember,
  InteractionReplyOptions,
  InteractionResponse,
  MessagePayload,
  User,
} from "discord.js";
import { authService } from "../../src/services";
import SpyInstance = jest.SpyInstance;
import { MockCommand } from "../mocks/command.mock";

describe("abstract command", () => {
  let basicInteraction: ChatInputCommandInteraction;
  let noMemberInteraction: ChatInputCommandInteraction;
  let unAuthorizedMemberInteraction: ChatInputCommandInteraction;

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

  let command: MockCommand;

  beforeAll(() => {
    command = new MockCommand(true);

    member = {
      id: "authorized",
      roles: {},
    } as GuildMember;

    basicInteraction = {
      reply: (message: string) => {
        console.log("Basic replying to command with:", message);
      },
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
      reply: (message: string) => {
        console.log("NoMember replying to command with:", message);
      },
    } as unknown as ChatInputCommandInteraction;
    unAuthorizedMemberInteraction = {
      reply: (message: string) => {
        console.log("Unauthorized replying to command with:", message);
      },
      member: {
        id: "unauthorized",
        roles: {},
      } as GuildMember,
    } as unknown as ChatInputCommandInteraction;
  });

  beforeEach(() => {
    runSpy = jest.spyOn(command, "run");

    jest
      .spyOn(authService, "memberIsAdmin")
      .mockImplementation((member) =>
        Promise.resolve(member.id === "authorized"),
      );
  });

  it("Should call child class run command because member is authorized", async () => {
    runSpy.mockClear();
    replySpy = jest.spyOn(basicInteraction, "reply");
    await command.execute(basicInteraction);
    expect(runSpy).toHaveBeenCalledWith(basicInteraction);
    expect(replySpy).not.toHaveBeenCalled();
  });

  it("Should call child class run command because member does not need to be authorized", async () => {
    command.isAdmin = false;
    runSpy.mockClear();
    replySpy = jest.spyOn(noMemberInteraction, "reply");
    await command.execute(noMemberInteraction);
    expect(runSpy).toHaveBeenCalledWith(noMemberInteraction);
    expect(replySpy).not.toHaveBeenCalled();
    command.isAdmin = true;
  });

  describe("errors", () => {
    it("should not call run command because there is no member", async () => {
      runSpy.mockClear();
      replySpy = jest.spyOn(noMemberInteraction, "reply");
      await command.execute(noMemberInteraction);
      expect(replySpy).toHaveBeenCalledWith(
        "Can't find the member issuing the command or this is an api command, no command executed",
      );
      expect(runSpy).not.toHaveBeenCalled();
    });

    it("should not call run command because member is not authorized", async () => {
      runSpy.mockClear();
      replySpy = jest.spyOn(unAuthorizedMemberInteraction, "reply");
      await command.execute(unAuthorizedMemberInteraction);
      expect(replySpy).toHaveBeenCalledWith(
        "User calling command is not authorized",
      );
      expect(runSpy).not.toHaveBeenCalled();
    });
  });
});
