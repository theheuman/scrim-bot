import {
  GuildMember,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  InteractionResponse,
  Message,
  MessagePayload,
} from "discord.js";
import { signupsService } from "../../../../src/services";
import SpyInstance = jest.SpyInstance;
import { CustomInteraction } from "../../../../src/commands/interaction";
import { CreateScrimCommand } from "../../../../src/commands/admin/scrim-crud/create-scrim";

describe("Create scrim", () => {
  let basicInteraction: CustomInteraction;
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

  const fakeCurrentDate = new Date("2024-11-14");

  const fakeScrimDate = new Date("2024-11-15T20:00:00-05:00");

  let command: CreateScrimCommand;

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
          if (key === "name") {
            return "open-edwe";
          }
        },
        getDateTime: () => {
          return fakeScrimDate;
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
    } as unknown as CustomInteraction;
    replySpy = jest.spyOn(basicInteraction, "reply");
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    signupsCreateScrimSpy = jest.spyOn(signupsService, "createScrim");
    signupsCreateScrimSpy.mockImplementation(() => {
      return Promise.resolve("uuid-87623");
    });
    jest.useFakeTimers().setSystemTime(fakeCurrentDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    replySpy.mockClear();
    editReplySpy.mockClear();
    signupsCreateScrimSpy.mockClear();
    newChannelMessageSpy.mockClear();
    // TODO mock signup service
    command = new CreateScrimCommand(signupsService);
  });

  it("Should create scrim", async () => {
    newChannelMessageSpy.mockImplementationOnce((message: string) => {
      expect(message.includes("<t:1731718800:t>")).toEqual(true);
    });
    await command.run(basicInteraction);
    expect(editReplySpy).toHaveBeenCalledWith(
      "Scrim created. Channel: <#newly created channel id>",
    );
    expect(signupsCreateScrimSpy).toHaveBeenCalledWith(
      "newly created channel id",
      fakeScrimDate,
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
      } as unknown as CustomInteraction;
      replySpy = jest.spyOn(noGuildInteraction, "reply");
      await command.run(noGuildInteraction);
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
      } as unknown as CustomInteraction;
      replySpy = jest.spyOn(noChannelInteraction, "reply");
      await command.run(noChannelInteraction);
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
            if (key === "name") {
              return "open-edwe";
            }
          },
          getDateTime: () => {
            return fakeScrimDate;
          },
        },
        reply: (message: string) => {
          console.log("Replying to command with:", message);
        },
        editReply: (message: string) => {
          console.log("Editing reply message to:", message);
        },
      } as unknown as CustomInteraction;
      editReplySpy = jest.spyOn(noPermissionsInteraction, "editReply");
      await command.run(noPermissionsInteraction);
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
      await command.run(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Scrim not created: Error: DB Failure",
      );
    });
  });
});
