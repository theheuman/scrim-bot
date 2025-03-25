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
        guildId: "a valid guild id",
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
