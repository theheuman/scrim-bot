import {
  ChatInputCommandInteraction,
  GuildMember,
  InteractionReplyOptions,
  InteractionResponse,
  MessagePayload,
  Snowflake,
  User,
} from "discord.js";
import { authService, prioService } from "../../../../src/services";
import SpyInstance = jest.SpyInstance;
import { AddPrioCommand } from "../../../../src/commands/admin/prio/add-prio";

describe("Add prio", () => {
  // this is supposed to be a Snowflake but I don't want to mock it strings work just fine
  const channelId = "some id" as unknown as Snowflake;
  let basicInteraction: ChatInputCommandInteraction;
  let singleUserInteraction: ChatInputCommandInteraction;
  let incorrectStartDateInteraction: ChatInputCommandInteraction;
  let incorrectEndDateInteraction: ChatInputCommandInteraction;

  let setPlayerPrioSpy: SpyInstance<
    Promise<string[]>,
    [
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

  let command: AddPrioCommand;

  beforeAll(() => {
    command = new AddPrioCommand();

    member = {
      roles: {},
    } as GuildMember;

    let singleUserInteractionGetUserCount = 0;

    basicInteraction = {
      options: {
        getUser: () => supreme,
        getString: (key: string) => {
          if (key === "reason") {
            return "Prio reason";
          } else if (key === "startDate") {
            return "1/12";
          } else if (key === "endDate") {
            return "1/13";
          }
        },
        getNumber: () => -400,
      },
      reply: (message: string) => {
        console.log("Replying to command with:", message);
      },
      channelId,
      member,
    } as unknown as ChatInputCommandInteraction;

    singleUserInteraction = {
      options: {
        getUser: () => {
          if (singleUserInteractionGetUserCount === 0) {
            singleUserInteractionGetUserCount++;
            return supreme;
          }
        },
        getString: (key: string) => {
          if (key === "reason") {
            return "Prio reason";
          } else if (key === "startDate") {
            return "1/12";
          } else if (key === "endDate") {
            return "1/13";
          }
        },
        getNumber: () => -400,
      },
      reply: (message: string) => {
        console.log("Replying to command with:", message);
      },
      channelId,
      member,
    } as unknown as ChatInputCommandInteraction;

    incorrectStartDateInteraction = {
      options: {
        getUser: () => theHeuman,
        getString: (key: string) => {
          if (key === "reason") {
            return "Prio reason";
          } else if (key === "startDate") {
            return "lol";
          } else if (key === "endDate") {
            return "no";
          }
        },
        getNumber: () => -400,
      },
      reply: (message: string) => {
        console.log("Replying to command with:", message);
      },
      channelId,
    } as unknown as ChatInputCommandInteraction;
    incorrectEndDateInteraction = {
      options: {
        getUser: () => theHeuman,
        getString: (key: string) => {
          if (key === "reason") {
            return "Prio reason";
          } else if (key === "startDate") {
            return "1/12";
          } else if (key === "endDate") {
            return "11/no";
          }
        },
        getNumber: () => -400,
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

  it("Should add prio to 1 user", async () => {
    setPlayerPrioSpy.mockImplementation(
      (
        prioUsers: User[],
        _: Date,
        __: Date,
        amount: number,
        reason: string,
      ) => {
        expect(prioUsers).toEqual([supreme]);
        expect(amount).toEqual(-400);
        expect(reason).toEqual("Prio reason");
        return Promise.resolve(["db id"]);
      },
    );

    replySpy = jest.spyOn(singleUserInteraction, "reply");
    await command.run(singleUserInteraction);
    expect(replySpy).toHaveBeenCalledWith(
      "Added -400 prio to 1 player from 1/12 to 1/13 because Prio reason. Supreme prio id: db id",
    );
    // if this is failing, and you haven't changed the amount of assertions take a look a little higher in the log to see if the setPlayerPrioSpy was called with differing values
    expect.assertions(4);
  });

  it("Should add prio to multiple users", async () => {
    setPlayerPrioSpy.mockImplementation(
      (
        prioUsers: User[],
        _: Date,
        __: Date,
        amount: number,
        reason: string,
      ) => {
        expect(prioUsers).toEqual([supreme, supreme, supreme]);
        expect(amount).toEqual(-400);
        expect(reason).toEqual("Prio reason");
        return Promise.resolve(["db id", "db id 2", "db id 3"]);
      },
    );

    replySpy = jest.spyOn(basicInteraction, "reply");
    await command.run(basicInteraction);
    expect(replySpy).toHaveBeenCalledWith(
      "Added -400 prio to 3 players from 1/12 to 1/13 because Prio reason. Supreme prio id: db id; Supreme prio id: db id 2; Supreme prio id: db id 3",
    );
    // if this is failing, and you haven't changed the amount of assertions take a look a little higher in the log to see if the setPlayerPrioSpy was called with differing values
    expect.assertions(4);
  });

  describe("errors", () => {
    beforeEach(() => {
      setPlayerPrioSpy.mockImplementation(() => {
        return Promise.resolve([]);
      });
    });

    it("should not add prio because the start date is incorrectly formatted", async () => {
      setPlayerPrioSpy.mockClear();
      replySpy = jest.spyOn(incorrectStartDateInteraction, "reply");
      await command.run(incorrectStartDateInteraction);
      expect(replySpy).toHaveBeenCalledWith(
        "Can't parse start date Error: Month not parseable",
      );
      expect(setPlayerPrioSpy).not.toHaveBeenCalled();
    });

    it("should not add prio because the end date is incorrectly formatted", async () => {
      setPlayerPrioSpy.mockClear();
      replySpy = jest.spyOn(incorrectEndDateInteraction, "reply");
      await command.run(incorrectEndDateInteraction);
      expect(replySpy).toHaveBeenCalledWith(
        "Can't parse end date Error: Day not parseable",
      );
      expect(setPlayerPrioSpy).not.toHaveBeenCalled();
    });
  });
});
