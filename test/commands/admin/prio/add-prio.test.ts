import {
  GuildMember,
  InteractionReplyOptions,
  InteractionResponse,
  MessagePayload,
  Snowflake,
  User,
} from "discord.js";
import { prioService } from "../../../../src/services";
import SpyInstance = jest.SpyInstance;
import { AddPrioCommand } from "../../../../src/commands/admin/prio/add-prio";
import { CustomInteraction } from "../../../../src/commands/interaction";

describe("Add prio", () => {
  // this is supposed to be a Snowflake but I don't want to mock it strings work just fine
  const channelId = "some id" as unknown as Snowflake;
  let basicInteraction: CustomInteraction;
  let singleUserInteraction: CustomInteraction;

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
  let replySpy: SpyInstance<
    Promise<InteractionResponse<boolean>>,
    [reply: string | InteractionReplyOptions | MessagePayload],
    string
  >;

  let command: AddPrioCommand;

  beforeAll(() => {
    command = new AddPrioCommand(prioService);

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
          }
        },
        getDate: (key: string) => {
          if (key === "startDate") {
            return new Date("1/12");
          } else if (key === "endDate") {
            return new Date("1/13");
          }
        },
        getNumber: () => -400,
      },
      reply: (message: string) => {
        console.log("Replying to command with:", message);
      },
      channelId,
      member,
    } as unknown as CustomInteraction;

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
          }
        },
        getDate: (key: string) => {
          if (key === "startDate") {
            return null;
          } else if (key === "endDate") {
            return new Date("1/13");
          }
        },
        getNumber: () => -400,
      },
      reply: (message: string) => {
        console.log("Replying to command with:", message);
      },
      channelId,
      member,
    } as unknown as CustomInteraction;

    setPlayerPrioSpy = jest.spyOn(prioService, "setPlayerPrio");
    setPlayerPrioSpy.mockClear();
    setPlayerPrioSpy.mockReturnValue(Promise.resolve([]));
  });

  it("Should add prio to 1 user", async () => {
    const fakeDate = new Date("2024-12-14T22:30:00-05:00");
    console.log("System time", fakeDate);
    jest.useFakeTimers();
    jest.setSystemTime(fakeDate);

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
      "Added -400 prio to 1 player from 12/14 10:30 PM to 1/13 11:59 PM because Prio reason. Supreme prio id: db id",
    );
    // if this is failing, and you haven't changed the amount of assertions take, a look a little higher in the log to see if the setPlayerPrioSpy was called with differing values
    expect.assertions(4);
    jest.setSystemTime(jest.getRealSystemTime());
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
      "Added -400 prio to 3 players from 1/12 12:00 AM to 1/13 11:59 PM because Prio reason. Supreme prio id: db id; Supreme prio id: db id 2; Supreme prio id: db id 3",
    );
    // if this is failing, and you haven't changed the amount of assertions, take a look a little higher in the log to see if the setPlayerPrioSpy was called with differing values
    expect.assertions(4);
  });

  it("Should reply with an error if setPrio fails", async () => {
    setPlayerPrioSpy.mockImplementation(() => {
      return Promise.reject("The database fell asleep");
    });

    replySpy = jest.spyOn(basicInteraction, "reply");
    await command.run(basicInteraction);
    expect(replySpy).toHaveBeenCalledWith(
      "Error while executing set prio: The database fell asleep",
    );
  });
});
