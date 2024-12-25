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
  // this is supposed to be a Snowflake but I don't want to mock it strings work just fine
  const channelId = "some id" as unknown as Snowflake;
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
            return "8 pm";
          } else if (key === "date") {
            return "11/15";
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

  it("Should set scrim date normally", async () => {
    newChannelMessageSpy.mockImplementationOnce((message: string) => {
      expect(message.includes("<t:1731718800:t>")).toEqual(true);
    });
    await createScrimCommand.execute(basicInteraction);
    expect(editReplySpy).toHaveBeenCalledWith(
      "Scrim created. Channel: <#newly created channel id>",
    );
    expect(signupsCreateScrimSpy).toHaveBeenCalledWith(
      "newly created channel id",
      new Date("2024-11-15T20:00:00-05:00"),
    );
  });

  it("Should set scrim date in january", async () => {});

  it("Should set scrim for 12:30 am", async () => {});
  it("Should set scrim for a normal am hour", async () => {});

  it("Should set scrim for 12:30 pm", async () => {});
  it("Should set scrim for a normal pm hour", async () => {});

  describe("errors", () => {
    describe("invalid date", () => {
      it("Should not create scrim because of invalid month", async () => {
        replySpy = jest.spyOn(basicInteraction, "reply");
        await createScrimCommand.execute(basicInteraction);
        expect(replySpy).toHaveBeenCalledWith(
          "Can't find the member issuing the command or this is an api command, no command executed",
        );
        expect(signupsCreateScrimSpy).not.toHaveBeenCalled();
      });

      it("Should not create scrim because of invalid day", async () => {});
    });

    describe("invalid time", () => {
      it("Should not create scrim because of invalid hour", async () => {
        replySpy = jest.spyOn(basicInteraction, "reply");
        await createScrimCommand.execute(basicInteraction);
        expect(replySpy).toHaveBeenCalledWith(
          "Can't find the member issuing the command or this is an api command, no command executed",
        );
        expect(signupsCreateScrimSpy).not.toHaveBeenCalled();
      });

      it("Should not create scrim because of invalid minute", async () => {});

      it("Should not create scrim because of invalid ampm label", async () => {});
    });
  });
});
