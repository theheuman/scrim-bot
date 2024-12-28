import {
  ChatInputCommandInteraction,
  GuildMember,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  InteractionResponse,
  Message,
  MessagePayload,
  User,
} from "discord.js";
import { signupsService } from "../../../../src/services";
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

  it("Should create scrim", async () => {
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

  describe("errors", () => {
    it("should not create scrim because there is no guild", async () => {
      const noGuildInteraction = {
        guild: null,
        channel: {
          parent: {
            children: {
              create: () => null,
            },
          },
        },
        reply: (message: string) => {
          console.log("Replying to command with:", message);
        },
      } as unknown as ChatInputCommandInteraction;
      replySpy = jest.spyOn(noGuildInteraction, "reply");
      await createScrimCommand.execute(noGuildInteraction);
      expect(replySpy).toHaveBeenCalledWith("Can't find server, contact admin");
      expect(signupsCreateScrimSpy).not.toHaveBeenCalled();
    });

    it("should not create scrim because there is no channel", async () => {
      const noChannelInteraction = {
        guild: {
          channels: {
            create: () => null,
          },
        },
        channel: null,
        reply: (message: string) => {
          console.log("Replying to command with:", message);
        },
      } as unknown as ChatInputCommandInteraction;
      replySpy = jest.spyOn(noChannelInteraction, "reply");
      await createScrimCommand.execute(noChannelInteraction);
      expect(replySpy).toHaveBeenCalledWith(
        "Can't find channel command was sent from, contact admin",
      );
      expect(signupsCreateScrimSpy).not.toHaveBeenCalled();
    });

    it("should not create scrim because the bot is unable to create the channel", async () => {
      const noPermissionsInteraction = {
        guild: {
          channels: {
            create: () => {
              throw Error("Permissions missing");
            },
          },
        },
        channel: {},
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
          console.log("Editing reply message to:", message);
        },
      } as unknown as ChatInputCommandInteraction;
      editReplySpy = jest.spyOn(noPermissionsInteraction, "editReply");
      await createScrimCommand.execute(noPermissionsInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Scrim channel could not be created: Error: Permissions missing",
      );
      expect(signupsCreateScrimSpy).not.toHaveBeenCalled();
    });

    it("should not create scrim because the signup service had an error", async () => {
      signupsCreateScrimSpy.mockImplementation(async () => {
        throw Error("DB Failure");
      });
      editReplySpy = jest.spyOn(basicInteraction, "editReply");
      await createScrimCommand.execute(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Scrim not created: Error: DB Failure",
      );
    });
  });
});
