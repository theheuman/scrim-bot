import {
  Guild,
  Message,
  MessageEditOptions,
  MessagePayload,
  OmitPartialGroupDMChannel,
} from "discord.js";
import { Scrim } from "../../src/models/Scrims";
import { DiscordService } from "../../src/services/discord";
import { StaticValueServiceMock } from "../mocks/static-values.mock";
import { ExtendedClient } from "../../src/ExtendedClient";
import { ForumThreadChannel } from "discord.js/typings";
import { StaticValueService } from "../../src/services/static-values";
import SpyInstance = jest.SpyInstance;

jest.mock("../../src/config", () => {
  return {
    appConfig: {
      discord: {
        guildId: {
          scrim: "a valid guild id",
        },
      },
    },
  };
});

describe("Discord service", () => {
  let discordService: DiscordService;
  let staticValueMock: StaticValueServiceMock;
  let client: ExtendedClient;
  let guild: Guild;
  let forumChannel: ForumThreadChannel;
  let message: Message;
  let messageEditSpy: SpyInstance<
    Promise<OmitPartialGroupDMChannel<Message<boolean>>>,
    [content: string | MessageEditOptions | MessagePayload],
    string
  >;
  const scrimDescription = "the description of the scrim";
  const scrim = { dateTime: new Date(), discordChannel: "channel" } as Scrim;

  beforeEach(() => {
    staticValueMock = new StaticValueServiceMock();
    message = {
      edit: jest.fn(),
    } as unknown as Message;
    messageEditSpy = jest.spyOn(message, "edit");

    forumChannel = {
      fetchStarterMessage: () => Promise.resolve(message),
      isThread: () => true,
    } as unknown as ForumThreadChannel;

    guild = {
      channels: {
        cache: {
          get: () => forumChannel,
        },
      },
    } as unknown as Guild;

    client = {
      guilds: {
        cache: {
          get: () => guild,
        },
      },
    } as unknown as ExtendedClient;

    discordService = new DiscordService(
      client,
      staticValueMock as StaticValueService,
    );

    jest
      .spyOn(staticValueMock, "getInstructionText")
      .mockReturnValue(Promise.resolve(scrimDescription));
  });

  describe("sendScoresComputedMessage()", () => {
    const scoresChannelId = "scores-channel-id";
    const date = new Date("2026-04-18T20:00:00Z");
    const expectedTimestamp = Math.floor(date.valueOf() / 1000);
    let textChannel: { isTextBased: () => boolean; send: jest.Mock };
    let sendSpy: SpyInstance;
    let getChannelSpy: SpyInstance;

    beforeEach(() => {
      textChannel = { isTextBased: () => true, send: jest.fn() };
      sendSpy = jest.spyOn(textChannel, "send");
      getChannelSpy = jest
        .spyOn(guild.channels.cache, "get")
        .mockReturnValue(textChannel as never);
      jest
        .spyOn(staticValueMock, "getScrimScoresChannelId")
        .mockResolvedValue(scoresChannelId);
    });

    it("Should send a correctly formatted message for a single lobby", async () => {
      const lobbies = [
        {
          name: "VESA Scrim Lobby 1",
          link: "https://overstat.gg/tournament/141/19989.VESA_Scrim_Lobby_1_4_18_2026/standings/overall/scoreboard",
        },
      ];
      await discordService.sendScoresComputedMessage(date, lobbies);
      expect(getChannelSpy).toHaveBeenCalledWith(scoresChannelId);
      expect(sendSpy).toHaveBeenCalledWith(
        `<t:${expectedTimestamp}:f>\n[VESA Scrim Lobby 1](<https://overstat.gg/tournament/141/19989.VESA_Scrim_Lobby_1_4_18_2026/standings/overall/scoreboard>)`,
      );
    });

    it("Should send a correctly formatted message for multiple lobbies", async () => {
      const lobbies = [
        {
          name: "VESA Scrim Lobby 1",
          link: "https://overstat.gg/tournament/141/19989.VESA_Scrim_Lobby_1_4_18_2026/standings/overall/scoreboard",
        },
        {
          name: "VESA Scrim Lobby 2",
          link: "https://overstat.gg/tournament/141/19990.VESA_Scrim_Lobby_2_4_18_2026/standings/overall/scoreboard",
        },
      ];
      await discordService.sendScoresComputedMessage(date, lobbies);
      expect(sendSpy).toHaveBeenCalledWith(
        `<t:${expectedTimestamp}:f>\n[VESA Scrim Lobby 1](<https://overstat.gg/tournament/141/19989.VESA_Scrim_Lobby_1_4_18_2026/standings/overall/scoreboard>)\n[VESA Scrim Lobby 2](<https://overstat.gg/tournament/141/19990.VESA_Scrim_Lobby_2_4_18_2026/standings/overall/scoreboard>)`,
      );
    });

    describe("errors", () => {
      it("Should throw if scores channel ID is not configured", async () => {
        jest
          .spyOn(staticValueMock, "getScrimScoresChannelId")
          .mockResolvedValueOnce(undefined);
        await expect(
          discordService.sendScoresComputedMessage(date, []),
        ).rejects.toThrow("Scores channel ID not configured");
      });

      it("Should throw if guild is not found", async () => {
        jest.spyOn(client.guilds.cache, "get").mockReturnValueOnce(undefined);
        await expect(
          discordService.sendScoresComputedMessage(date, []),
        ).rejects.toThrow("Guild not found");
      });

      it("Should throw if scores channel is not found", async () => {
        jest.spyOn(guild.channels.cache, "get").mockReturnValueOnce(undefined);
        await expect(
          discordService.sendScoresComputedMessage(date, []),
        ).rejects.toThrow("Scores channel not found or not a text channel");
      });

      it("Should throw if scores channel is not a text channel", async () => {
        jest.spyOn(guild.channels.cache, "get").mockReturnValueOnce({
          isTextBased: () => false,
        } as never);
        await expect(
          discordService.sendScoresComputedMessage(date, []),
        ).rejects.toThrow("Scores channel not found or not a text channel");
      });
    });
  });

  it("Should update signup thread description", async () => {
    const getGuildSpy = jest.spyOn(client.guilds.cache, "get");
    const getForumThreadSpy = jest.spyOn(guild.channels.cache, "get");

    await discordService.updateSignupPostDescription(scrim, 0);

    expect(getGuildSpy).toHaveBeenCalledWith("a valid guild id");
    expect(getForumThreadSpy).toHaveBeenCalledWith(scrim.discordChannel);
    expect(messageEditSpy).toHaveBeenCalledWith(scrimDescription);
  });

  describe("errors", () => {
    it("Should instruction text not found error", async () => {
      jest
        .spyOn(staticValueMock, "getInstructionText")
        .mockReturnValueOnce(Promise.resolve(undefined));
      const causeException = async () => {
        await discordService.updateSignupPostDescription(scrim, 0);
      };
      await expect(causeException).rejects.toThrow(
        "Instruction text not found",
      );
    });

    it("Should throw guild not defined error", async () => {
      jest.spyOn(client.guilds.cache, "get").mockReturnValueOnce(undefined);
      const causeException = async () => {
        await discordService.updateSignupPostDescription(scrim, 0);
      };
      await expect(causeException).rejects.toThrow("Guild not found");
    });

    describe("Not a valid channel error", () => {
      it("Should throw signup thread not found error", async () => {
        jest.spyOn(guild.channels.cache, "get").mockReturnValueOnce(undefined);

        const causeException = async () => {
          await discordService.updateSignupPostDescription(scrim, 0);
        };
        await expect(causeException).rejects.toThrow(
          "Forum thread not found or not a valid thread",
        );
      });

      it("Should throw signup thread is not a thread error", async () => {
        jest.spyOn(forumChannel, "isThread").mockReturnValueOnce(false);

        const causeException = async () => {
          await discordService.updateSignupPostDescription(scrim, 0);
        };
        await expect(causeException).rejects.toThrow(
          "Forum thread not found or not a valid thread",
        );
      });
    });

    it("Should throw no signup post description error", async () => {
      jest
        .spyOn(forumChannel, "fetchStarterMessage")
        .mockReturnValueOnce(Promise.resolve(null));
      const causeException = async () => {
        await discordService.updateSignupPostDescription(scrim, 0);
      };
      await expect(causeException).rejects.toThrow(
        "Signup post description not found",
      );
    });
  });
});
