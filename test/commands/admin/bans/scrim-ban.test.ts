import {
  GuildMember,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  Message,
  MessagePayload,
  Snowflake,
  User,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { ScrimBanCommand } from "../../../../src/commands/admin/bans/scrim-ban";
import { CustomInteraction } from "../../../../src/commands/interaction";
import { AuthMock } from "../../../mocks/auth.mock";
import { AuthService } from "../../../../src/services/auth";
import { BanServiceMock } from "../../../mocks/ban.mock";
import { BanService } from "../../../../src/services/ban";

describe("Scrim ban", () => {
  // this is supposed to be a Snowflake but I don't want to mock it strings work just fine
  const channelId = "some id" as unknown as Snowflake;
  let basicInteraction: CustomInteraction;
  let singleUserInteraction: CustomInteraction;

  let addBanSpy: SpyInstance<
    Promise<string[]>,
    [usersToBan: User[], startDate: Date, endDate: Date, reason: string],
    string
  >;
  let member: GuildMember;
  const supreme: User = { displayName: "Supreme", id: "1" } as unknown as User;
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

  const mockBanService = new BanServiceMock();

  let command: ScrimBanCommand;

  beforeAll(() => {
    command = new ScrimBanCommand(
      new AuthMock() as AuthService,
      mockBanService as BanService,
    );

    member = {
      roles: {},
    } as GuildMember;

    let singleUserInteractionGetUserCount = 0;

    basicInteraction = {
      options: {
        getUser: () => supreme,
        getString: (key: string) => {
          if (key === "reason") {
            return "Ban reason";
          }
        },
        getDateTime: (key: string) => {
          if (key === "startdate") {
            return new Date("2025-01-12T00:00:00-05:00");
          } else if (key === "enddate") {
            return new Date("2025-01-13T00:00:00-05:00");
          }
        },
        getNumber: () => -400,
      },
      editReply: jest.fn(),
      followUp: jest.fn(),
      deleteReply: jest.fn(),
      channelId,
      member,
      user: {
        id: "command invoker",
      },
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
            return "Ban reason";
          }
        },
        getDateTime: (key: string) => {
          if (key === "startdate") {
            return null;
          } else if (key === "enddate") {
            return new Date("2025-01-13T00:00:00-05:00");
          }
        },
        getNumber: () => -400,
      },
      editReply: jest.fn(),
      followUp: jest.fn(),
      deleteReply: jest.fn(),
      channelId,
      member,
      user: {
        id: "command invoker",
      },
    } as unknown as CustomInteraction;

    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    editReplySpy.mockClear();
    followUpSpy = jest.spyOn(basicInteraction, "followUp");
    followUpSpy.mockClear();

    addBanSpy = jest.spyOn(mockBanService, "addBans");
    addBanSpy.mockClear();
    addBanSpy.mockReturnValue(Promise.resolve([]));
  });

  it("Should ban 1 user", async () => {
    const fakeDate = new Date("2024-12-14T22:30:00-05:00");
    jest.useFakeTimers();
    jest.setSystemTime(fakeDate);

    addBanSpy.mockImplementation(
      (usersToBan: User[], _: Date, __: Date, reason: string) => {
        expect(usersToBan).toEqual([supreme]);
        expect(reason).toEqual("Ban reason");
        return Promise.resolve(["db id"]);
      },
    );

    followUpSpy = jest.spyOn(singleUserInteraction, "followUp");
    await command.run(singleUserInteraction);
    expect(followUpSpy).toHaveBeenCalledWith(
      `Scrim banned the following player from <t:${Math.floor(fakeDate.valueOf() / 1000)}:f> to <t:${Math.floor(new Date("2025-01-13T23:59:59-05:00").valueOf() / 1000)}:f>\nReason: Ban reason.\nID's:\n<@1> ban id: db id\nAdded by <@command invoker>`,
    );
    // if this is failing, and you haven't changed the amount of assertions, take a look a little higher in the log to see if the addBanSpy was called with differing values
    expect.assertions(3);
    jest.setSystemTime(jest.getRealSystemTime());
  });

  it("Should ban multiple users", async () => {
    addBanSpy.mockImplementation(
      (usersToBan: User[], _: Date, __: Date, reason: string) => {
        expect(usersToBan).toEqual([supreme, supreme, supreme]);
        expect(reason).toEqual("Ban reason");
        return Promise.resolve(["db id", "db id 2", "db id 3"]);
      },
    );

    followUpSpy = jest.spyOn(basicInteraction, "followUp");
    await command.run(basicInteraction);
    expect(followUpSpy).toHaveBeenCalledWith(
      `Scrim banned the following players from ${command.formatDate(new Date("2025-01-12T00:00:00-05:00"))} to ${command.formatDate(new Date("2025-01-13T23:59:59-05:00"))}\nReason: Ban reason.\nID's:\n<@1> ban id: db id\n<@1> ban id: db id 2\n<@1> ban id: db id 3\nAdded by <@command invoker>`,
    );
    // if this is failing, and you haven't changed the amount of assertions, take a look a little higher in the log to see if the addBanSpy was called with differing values
    expect.assertions(3);
  });

  it("Should reply with an error if addBan fails", async () => {
    addBanSpy.mockImplementation(() => {
      return Promise.reject("The database fell asleep");
    });

    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    await command.run(basicInteraction);
    expect(editReplySpy).toHaveBeenCalledWith(
      "Error while executing scrim ban: The database fell asleep",
    );
  });
});
