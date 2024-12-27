import {
  ChatInputCommandInteraction,
  GuildMember,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  InteractionResponse,
  Message,
  MessagePayload,
  Snowflake,
  User,
} from "discord.js";
import { prioService, signupsService } from "../../../../src/services";
import SpyInstance = jest.SpyInstance;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const createScrimCommand = require("../../../../src/commands/admin/scrim-crud/create-scrim");

describe("Create scrim", () => {
  let basicInteraction: ChatInputCommandInteraction;
  let member: GuildMember;
  let replySpy: SpyInstance<
    Promise<InteractionResponse<boolean>>,
    [reply: string | InteractionReplyOptions | MessagePayload],
    string
  >;
  let editReplySpy: SpyInstance<
    Promise<Message<boolean>>,
    [options: string | InteractionEditReplyOptions | MessagePayload],
    string
  >;
  let signupsCreateScrimSpy: SpyInstance<
    Promise<string>,
    [channelId: string, scrimDate: Date],
    string
  >;
  const newChannelMessageSpy = jest.fn();
  const fakeDate = new Date("2024-11-14");
  let scrimTimeString = "8 pm";
  let scrimDateString = "11/15";

  beforeAll(() => {
    member = {
      roles: {},
    } as GuildMember;
    const createChannelMethod = (options: { name: string; type: string }) => {
      console.log("Creating channel", options.name, options.type);
      return {
        send: newChannelMessageSpy,
        id: "newly created channel id",
      };
    };
    basicInteraction = {
      guild: {
        channels: {
          create: createChannelMethod,
        },
      },
      options: {
        getString: (key: string) => {
          if (key === "time") {
            return scrimTimeString;
          } else if (key === "date") {
            return scrimDateString;
          } else if (key === "name") {
            return "open-edwe";
          }
        },
      },
      reply: (message: string) => {
        console.log("Replying to command with:", message);
      },
      editReply: (message: string) => {
        console.log("Editing reply to:", message);
      },
      channel: {
        parent: {
          children: {
            create: createChannelMethod,
          },
        },
      },
      member,
    } as unknown as ChatInputCommandInteraction;
    replySpy = jest.spyOn(basicInteraction, "reply");
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    signupsCreateScrimSpy = jest.spyOn(signupsService, "createScrim");
    signupsCreateScrimSpy.mockImplementation(() => {
      return Promise.resolve("uuid-87623");
    });
    jest.useFakeTimers().setSystemTime(fakeDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    replySpy.mockClear();
    editReplySpy.mockClear();
    signupsCreateScrimSpy.mockClear();
    newChannelMessageSpy.mockClear();
  });

  it("Should set scrim date in January", async () => {
    jest.setSystemTime(new Date("2024-12-2"));
    scrimDateString = "1/1";
    scrimTimeString = "8 pm";

    await createScrimCommand.execute(basicInteraction);
    expect(signupsCreateScrimSpy).toHaveBeenCalledWith(
      "newly created channel id",
      new Date("2025-01-01T20:00:00-05:00"),
    );
  });

  it("Should set scrim for 12:30 am", async () => {
    jest.setSystemTime(new Date("2024-12-2"));
    scrimDateString = "12/3";
    scrimTimeString = "12:30 am";

    await createScrimCommand.execute(basicInteraction);
    expect(signupsCreateScrimSpy).toHaveBeenCalledWith(
      "newly created channel id",
      new Date("2024-12-03T00:30:00-05:00"),
    );
  });

  it("Should set scrim for a normal am hour", async () => {
    jest.setSystemTime(new Date("2024-12-2"));
    scrimDateString = "12/3";
    scrimTimeString = "10:00 am";

    await createScrimCommand.execute(basicInteraction);
    expect(signupsCreateScrimSpy).toHaveBeenCalledWith(
      "newly created channel id",
      new Date("2024-12-03T10:00:00-05:00"),
    );
  });

  it("Should set scrim for 12:30 pm", async () => {
    jest.setSystemTime(new Date("2024-12-2"));
    scrimDateString = "12/3";
    scrimTimeString = "12:30 pm";

    await createScrimCommand.execute(basicInteraction);
    expect(signupsCreateScrimSpy).toHaveBeenCalledWith(
      "newly created channel id",
      new Date("2024-12-03T12:30:00-05:00"),
    );
  });

  describe("errors", () => {
    describe("invalid date", () => {
      it("Should not create scrim because of invalid month", async () => {
        jest.setSystemTime(new Date("2024-12-2"));
        scrimDateString = "13/3";
        scrimTimeString = "8:00 pm";

        await createScrimCommand.execute(basicInteraction);
        expect(replySpy).toHaveBeenCalledWith(
          "Can't parse arguments: Error: Month not parseable; please supply correct format Expected MM/dd Expected hh:mm pm",
        );
        expect(signupsCreateScrimSpy).not.toHaveBeenCalled();
      });

      it("Should not create scrim because of invalid day", async () => {
        jest.setSystemTime(new Date("2024-12-2"));
        scrimDateString = "12/32";
        scrimTimeString = "8:00 pm";

        await createScrimCommand.execute(basicInteraction);
        expect(replySpy).toHaveBeenCalledWith(
          "Can't parse arguments: Error: Day not parseable; please supply correct format Expected MM/dd Expected hh:mm pm",
        );
        expect(signupsCreateScrimSpy).not.toHaveBeenCalled();
      });
    });

    describe("invalid time", () => {
      it("Should not create scrim because of invalid hour", async () => {
        jest.setSystemTime(new Date("2024-12-2"));
        scrimDateString = "12/3";
        scrimTimeString = "13:00 pm";

        await createScrimCommand.execute(basicInteraction);
        expect(replySpy).toHaveBeenCalledWith(
          "Can't parse arguments: Error: Hour not valid; please supply correct format Expected MM/dd Expected hh:mm pm",
        );
        expect(signupsCreateScrimSpy).not.toHaveBeenCalled();
      });

      it("Should not create scrim because of invalid minute", async () => {
        jest.setSystemTime(new Date("2024-12-2"));
        scrimDateString = "12/3";
        scrimTimeString = "8:60 pm";

        await createScrimCommand.execute(basicInteraction);
        expect(replySpy).toHaveBeenCalledWith(
          "Can't parse arguments: Error: Minute not valid; please supply correct format Expected MM/dd Expected hh:mm pm",
        );
        expect(signupsCreateScrimSpy).not.toHaveBeenCalled();
      });

      it("Should not create scrim because of invalid ampm label", async () => {
        jest.setSystemTime(new Date("2024-12-2"));
        scrimDateString = "12/3";
        scrimTimeString = "8:00 xm";

        await createScrimCommand.execute(basicInteraction);
        expect(replySpy).toHaveBeenCalledWith(
          "Can't parse arguments: Error: am/pm label is invalid; please supply correct format Expected MM/dd Expected hh:mm pm",
        );
        expect(signupsCreateScrimSpy).not.toHaveBeenCalled();
      });
    });
  });
});
