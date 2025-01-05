import {
  GuildMember,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  InteractionResponse,
  Message,
  MessagePayload,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { CustomInteraction } from "../../../../src/commands/interaction";
import { CreateScrimCommand } from "../../../../src/commands/admin/scrim-crud/create-scrim";
import { AuthMock } from "../../../mocks/auth.mock";
import { AuthService } from "../../../../src/services/auth";
import { ScrimSignupMock } from "../../../mocks/signups.mock";
import { ScrimSignups } from "../../../../src/services/signups";
import { StaticValueServiceMock } from "../../../mocks/static-values.mock";
import { StaticValueService } from "../../../../src/services/static-values";

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
  const channelCreatedSpy = jest.fn();

  const fakeCurrentDate = new Date("2024-11-14");

  const fakeScrimDate = new Date("2024-11-15T20:00:00-05:00");

  let command: CreateScrimCommand;

  const mockScrimSignups = new ScrimSignupMock();
  const mockStaticValueService = new StaticValueServiceMock();

  beforeAll(() => {
    member = {
      roles: {},
    } as GuildMember;
    const forumChannel = {
      threads: {
        create: (options: {
          name: string;
          message: {
            content: string;
          };
        }) => {
          channelCreatedSpy(options.name, options.message.content);
          return { id: "forum thread id" };
        },
      },
    };
    basicInteraction = {
      client: {
        channels: {
          cache: {
            get: () => forumChannel,
          },
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
      member,
    } as unknown as CustomInteraction;
    replySpy = jest.spyOn(basicInteraction, "reply");
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    signupsCreateScrimSpy = jest.spyOn(mockScrimSignups, "createScrim");
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
    command = new CreateScrimCommand(
      new AuthMock() as AuthService,
      mockScrimSignups as unknown as ScrimSignups,
      mockStaticValueService as StaticValueService,
    );
  });

  it("Should create scrim", async () => {
    await command.run(basicInteraction);
    expect(editReplySpy).toHaveBeenCalledWith(
      "Scrim created. Channel: <#forum thread id>",
    );
    expect(channelCreatedSpy).toHaveBeenCalledWith(
      "11/15 8pm open-edwe",
      "Scrim date: <t:1731718800:t>\nDraft time: <t:1731717600:t>\nLobby post time: <t:1731711600:t>\nLow prio time: <t:1731713400:t>\nscrim signup instruction text",
    );
    expect(signupsCreateScrimSpy).toHaveBeenCalledWith(
      "forum thread id",
      fakeScrimDate,
    );
  });

  describe("errors", () => {
    it("should not create scrim because it can't find the forum channel", async () => {
      const noChannelInteraction = {
        client: {
          channels: {
            cache: {
              get: () => undefined,
            },
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
      } as unknown as CustomInteraction;
      editReplySpy = jest.spyOn(noChannelInteraction, "editReply");
      await command.run(noChannelInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Scrim channel could not be created. Error: Can't find forum channel in server, looking for id: discord forum id",
      );
      expect(signupsCreateScrimSpy).not.toHaveBeenCalled();
    });

    it("should not create scrim because the signup service had an error", async () => {
      signupsCreateScrimSpy.mockImplementationOnce(async () => {
        throw Error("DB Failure");
      });
      editReplySpy = jest.spyOn(basicInteraction, "editReply");
      await command.run(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Scrim not created: Error: DB Failure",
      );
    });

    it("should not create scrim because the static value service couldn't fetch the channel id", async () => {
      jest
        .spyOn(mockStaticValueService, "getSignupsChannelId")
        .mockReturnValueOnce(Promise.resolve(undefined));
      editReplySpy = jest.spyOn(basicInteraction, "editReply");
      await command.run(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Scrim channel could not be created. Error: Can't get signups forum channel id from db",
      );
    });

    it("should not create scrim because the static value service couldn't fetch the intro message", async () => {
      jest
        .spyOn(mockStaticValueService, "getInstructionText")
        .mockReturnValueOnce(Promise.resolve(undefined));
      editReplySpy = jest.spyOn(basicInteraction, "editReply");
      await command.run(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Scrim channel could not be created. Error: Can't get instruction text from db",
      );
    });
  });
});
