import {
  GuildMember,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  Message,
  MessagePayload,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { CustomInteraction } from "../../../../../src/commands/interaction";
import { CreateScrimCommand } from "../../../../../src/commands/scrims/admin/scrim-crud/create-scrim";
import { AuthService } from "../../../../../src/services/auth";
import { AlertService } from "../../../../../src/services/alert";
import { StaticValueService } from "../../../../../src/services/static-values";
import { ChannelType } from "discord-api-types/v10";
import { ScrimService } from "../../../../../src/services/scrim-service";
import { ScrimType } from "../../../../../src/models/Scrims";
import { provideMagickalMock } from "../../../../mocks/magickal-mock";

describe("Create scrim", () => {
  let basicInteraction: CustomInteraction;
  let member: GuildMember;
  let editReplySpy: SpyInstance<
    Promise<Message<boolean>>,
    [options: string | InteractionEditReplyOptions | MessagePayload],
    string
  >;
  let followUpSpy: SpyInstance<
    Promise<Message<boolean>>,
    [reply: string | InteractionReplyOptions | MessagePayload],
    string
  >;
  let signupsCreateScrimSpy: SpyInstance<
    Promise<string>,
    [discordChannelID: string, dateTime: Date, scrimType?: ScrimType],
    any
  >;
  const channelCreatedSpy = jest.fn();
  const channelDeleteSpy = jest.fn();

  const fakeCurrentDate = new Date("2024-11-14");

  const fakeScrimDate = new Date("2024-11-15T20:00:00-05:00");

  let command: CreateScrimCommand;

  const mockScrimService = provideMagickalMock(ScrimService);
  const mockStaticValueService = provideMagickalMock(StaticValueService);

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
          return { id: "forum thread id", delete: channelDeleteSpy };
        },
      },
      type: ChannelType.GuildForum,
    };
    basicInteraction = {
      options: {
        getString: (key: string) => {
          if (key === "name") {
            return "open-edwe";
          }
        },
        getDateTime: () => {
          return fakeScrimDate;
        },
        getChannel: () => forumChannel,
        getChoice: () => ScrimType.regular,
      },
      reply: jest.fn(),
      editReply: jest.fn(),
      followUp: jest.fn(),
      deleteReply: jest.fn(),
      member,
    } as unknown as CustomInteraction;
    followUpSpy = jest.spyOn(basicInteraction, "followUp");
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    signupsCreateScrimSpy = jest.spyOn(mockScrimService, "createScrim");
    signupsCreateScrimSpy.mockImplementation(() => {
      return Promise.resolve("uuid-87623");
    });
    jest
      .spyOn(mockStaticValueService, "getInstructionText")
      .mockResolvedValue(
        "Scrim date: ${scrimTime}\nDraft time: ${draftTime}\nLobby post time: ${lobbyPostTime}\nLow prio time: ${lowPrioTime}\nscrim signup instruction text",
      );
    jest
      .spyOn(mockStaticValueService, "getScrimInfoTimes")
      .mockImplementation(async (scrimDate: Date) => {
        const lobbyPostDate = new Date(scrimDate.valueOf());
        lobbyPostDate.setTime(lobbyPostDate.valueOf() - 2 * 60 * 60 * 1000);
        const lowPrioDate = new Date(scrimDate.valueOf());
        lowPrioDate.setTime(lowPrioDate.valueOf() - 1.5 * 60 * 60 * 1000);
        const draftDate = new Date(scrimDate.valueOf());
        draftDate.setTime(draftDate.valueOf() - 30 * 60 * 1000);
        return {
          lobbyPostDate,
          lowPrioDate,
          draftDate,
          rosterLockDate: lobbyPostDate,
        };
      });
    jest.useFakeTimers().setSystemTime(fakeCurrentDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    followUpSpy.mockClear();
    editReplySpy.mockClear();
    signupsCreateScrimSpy.mockClear();
    command = new CreateScrimCommand(
      provideMagickalMock(AlertService),
      provideMagickalMock(AuthService),
      mockScrimService,
      mockStaticValueService,
    );
  });

  it("Should create scrim with regular scrim type", async () => {
    await command.run(basicInteraction);
    expect(followUpSpy).toHaveBeenCalledWith(
      "Scrim created. Channel: <#forum thread id>\nScrim type: regular",
    );
    expect(channelCreatedSpy).toHaveBeenCalledWith(
      "11/15 8pm open-edwe",
      "Scrim date: <t:1731718800:t>\nDraft time: <t:1731717000:t>\nLobby post time: <t:1731711600:t>\nLow prio time: <t:1731713400:t>\nscrim signup instruction text",
    );
    expect(signupsCreateScrimSpy).toHaveBeenCalledWith(
      "forum thread id",
      fakeScrimDate,
      ScrimType.regular,
    );
  });

  it("Should create scrim with league scrim type", async () => {
    const leagueInteraction = {
      ...basicInteraction,
      options: {
        ...basicInteraction.options,
        getChoice: () => ScrimType.league,
      },
    } as unknown as CustomInteraction;
    const leagueFollowUpSpy = jest.spyOn(leagueInteraction, "followUp");
    await command.run(leagueInteraction);
    expect(signupsCreateScrimSpy).toHaveBeenCalledWith(
      "forum thread id",
      fakeScrimDate,
      ScrimType.league,
    );
    expect(leagueFollowUpSpy).toHaveBeenCalledWith(
      "Scrim created. Channel: <#forum thread id>\nScrim type: league",
    );
  });

  describe("errors", () => {
    it("should not create scrim because the channel provided is not a forum channel", async () => {
      const noChannelInteraction = {
        options: {
          getString: (key: string) => {
            if (key === "name") {
              return "open-edwe";
            }
          },
          getDateTime: () => {
            return fakeScrimDate;
          },
          getChannel: () => ({ type: ChannelType.GuildText }),
          getChoice: () => null,
        },
        editReply: jest.fn(),
      } as unknown as CustomInteraction;
      editReplySpy = jest.spyOn(noChannelInteraction, "editReply");
      await command.run(noChannelInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Scrim post could not be created. Channel provided is not a forum channel",
      );
      expect(signupsCreateScrimSpy).not.toHaveBeenCalled();
    });

    it("should not create scrim because the signup service had an error", async () => {
      signupsCreateScrimSpy.mockImplementationOnce(async () => {
        throw Error("DB Failure");
      });
      editReplySpy = jest.spyOn(basicInteraction, "editReply");
      await command.run(basicInteraction);
      expect(channelDeleteSpy).toHaveBeenCalledWith(
        "Scrim not created correctly in db",
      );
      expect(editReplySpy).toHaveBeenCalledWith(
        "Scrim not created: Error: DB Failure",
      );
    });

    it("should not create scrim because the static value service couldn't fetch the intro message", async () => {
      jest
        .spyOn(mockStaticValueService, "getInstructionText")
        .mockReturnValueOnce(Promise.resolve(undefined));
      editReplySpy = jest.spyOn(basicInteraction, "editReply");
      await command.run(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Scrim post could not be created. Error: Can't get instruction text from db",
      );
    });
  });
});
