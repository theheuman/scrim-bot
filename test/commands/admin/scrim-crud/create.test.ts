import {
  ChatInputCommandInteraction,
  GuildMember,
  InteractionReplyOptions,
  InteractionResponse,
  MessagePayload,
  Snowflake,
  User,
} from "discord.js";
import { prioService } from "../../../../src/services";
import SpyInstance = jest.SpyInstance;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const createScrimCommand = require("../../../../src/commands/admin/scrim-crud/create-scrim");

describe("Create scrim", () => {
  // this is supposed to be a Snowflake but I don't want to mock it strings work just fine
  const channelId = "some id" as unknown as Snowflake;
  let basicInteraction: ChatInputCommandInteraction;
  let noMemberInteraction: ChatInputCommandInteraction;
  let setPlayerPrioSpy: SpyInstance<
    Promise<string[]>,
    [
      memberUsingCommand: GuildMember,
      prioUsers: User[],
      startDate: Date,
      endDate: Date,
      amount: number,
      reason: string,
    ],
    string
  >;
  let member: GuildMember;
  const supreme: User = { displayName: "Supreme", id: "1" } as unknown as User;
  const theHeuman: User = {
    displayName: "TheHeuman",
    id: "2",
  } as unknown as User;
  let replySpy: SpyInstance<
    Promise<InteractionResponse<boolean>>,
    [reply: string | InteractionReplyOptions | MessagePayload],
    string
  >;

  beforeAll(() => {
    member = {
      roles: {},
    } as GuildMember;
    basicInteraction = {
      options: {
        getUser: () => supreme,
      },
      reply: (message: string) => {
        console.log("Replying to command with:", message);
      },
      channelId,
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
        console.log("Replying to command with:", message);
      },
      channelId,
    } as unknown as ChatInputCommandInteraction;
    setPlayerPrioSpy = jest.spyOn(prioService, "setPlayerPrio");
    setPlayerPrioSpy.mockClear();
    setPlayerPrioSpy.mockReturnValue(Promise.resolve([]));
  });

  it("Should create scrim", async () => {});

  describe("errors", () => {
    it("should not create scrim because there is no member", async () => {
      setPlayerPrioSpy.mockClear();
      replySpy = jest.spyOn(noMemberInteraction, "reply");
      await createScrimCommand.execute(noMemberInteraction);
      expect(replySpy).toHaveBeenCalledWith(
        "Can't find the member issuing the command or this is an api command, no command executed",
      );
      expect(setPlayerPrioSpy).not.toHaveBeenCalled();
    });
  });
});
