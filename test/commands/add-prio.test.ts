import {
  ChatInputCommandInteraction,
  GuildMember,
  InteractionReplyOptions,
  InteractionResponse,
  MessagePayload,
  Snowflake,
  User,
} from "discord.js";
import { prioService } from "../../src/services";
import SpyInstance = jest.SpyInstance;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const addPrioCommand = require("../../src/commands/utility/add-low-prio");

describe("Add prio", () => {
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
  const supreme: User = { name: "Supreme", id: "1" } as unknown as User;
  const theHeuman: User = { name: "TheHeuman", id: "2" } as unknown as User;
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

  it("Should add prio", async () => {
    setPlayerPrioSpy.mockImplementation(
      (
        memberUsingCommand: GuildMember,
        prioUsers: User[],
        _: Date,
        __: Date,
        amount: number,
        reason: string,
      ) => {
        expect(memberUsingCommand).toEqual(member);
        expect(prioUsers).toEqual([supreme, supreme, supreme]);
        expect(amount).toEqual(-400);
        expect(reason).toEqual("Prio reason");
        return Promise.resolve(["db id", "db id 2", "db id 3"]);
      },
    );

    replySpy = jest.spyOn(basicInteraction, "reply");
    await addPrioCommand.execute(basicInteraction);
    expect(replySpy).toHaveBeenCalledWith(
      "Added -400 prio to 3 players from 1/12/25 to 1/13/25 because Prio reason. Supreme added prio with id: db id; Supreme added prio with id: db id 2; Supreme added prio with id: db id 3",
    );
    // if this is failing, and you haven't changed the amount of assertions take a look a little higher in the log to see if the setPlayerPrioSpy was called with differing values
    expect.assertions(5);
  });

  describe("errors", () => {
    it("should not add prio because there is no member", async () => {
      setPlayerPrioSpy.mockClear();
      replySpy = jest.spyOn(noMemberInteraction, "reply");
      await addPrioCommand.execute(noMemberInteraction);
      expect(replySpy).toHaveBeenCalledWith(
        "Can't find the member issuing the command or this is an api command, no command executed",
      );
      expect(setPlayerPrioSpy).not.toHaveBeenCalled();
    });
  });
});
