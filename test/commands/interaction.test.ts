import {
  ChatInputCommandInteraction,
  GuildMember,
  InteractionReplyOptions,
  InteractionResponse,
  MessagePayload,
  User,
} from "discord.js";
import { authService } from "../../src/services";
import SpyInstance = jest.SpyInstance;
import { MockCommand } from "../mocks/command.mock";
import { getCustomOptions } from "../../src/commands/interaction";

describe("Custom interaction", () => {
  let correctDateInteraction: ChatInputCommandInteraction;
  let malformedMonthInteraction: ChatInputCommandInteraction;
  let malformedDayInteraction: ChatInputCommandInteraction;
  let missingStringInteraction: ChatInputCommandInteraction;

  let replySpy: SpyInstance<
    Promise<InteractionResponse<boolean>>,
    [reply: string | InteractionReplyOptions | MessagePayload],
    string
  >;

  beforeAll(() => {
    correctDateInteraction = {
      options: {
        getString: () => "11/12",
      },
      reply: (message: string) => {
        console.log("Basic replying to command with:", message);
      },
    } as unknown as ChatInputCommandInteraction;

    malformedDayInteraction = {
      options: {
        getString: () => "11/no",
      },
      reply: (message: string) => {
        console.log("Replying to command with:", message);
      },
    } as unknown as ChatInputCommandInteraction;

    malformedMonthInteraction = {
      options: {
        getString: () => "lol/12",
      },
      reply: (message: string) => {
        console.log("Replying to command with:", message);
      },
    } as unknown as ChatInputCommandInteraction;

    missingStringInteraction = {
      options: {
        getString: () => null,
      },
      reply: (message: string) => {
        console.log("Replying to command with:", message);
      },
    } as unknown as ChatInputCommandInteraction;
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-11-14"));
  });

  afterEach(() => {
    jest.setSystemTime(jest.getRealSystemTime());
    jest.useRealTimers();
  });

  it("Should return a correct date", async () => {
    const customOptions = getCustomOptions(correctDateInteraction);
    const date = customOptions.getDate("date");
    expect(date).toEqual(new Date("2024-11-12T00:00:00-05:00"));
  });

  it("should return null when date is not required and string does not exist", async () => {
    const customOptions = getCustomOptions(missingStringInteraction);
    const date = customOptions.getDate("date");
    expect(date).toEqual(null);
  });

  describe("errors", () => {
    it("should throw error when date is not required and string exists", async () => {
      replySpy = jest.spyOn(malformedMonthInteraction, "reply");
      const customOptions = getCustomOptions(malformedMonthInteraction);
      const expectErrors = () => {
        customOptions.getDate("date");
      };
      expect(expectErrors).toThrow(
        "Unable to parse a date argument that was supplied",
      );
      expect(replySpy).toHaveBeenCalledWith(
        "Can't parse date. Required: false. Error: Month not parseable",
      );
    });

    it("should throw error when date is required", async () => {
      replySpy = jest.spyOn(malformedDayInteraction, "reply");
      const customOptions = getCustomOptions(malformedDayInteraction);
      const expectErrors = () => {
        customOptions.getDate("date", true);
      };
      expect(expectErrors).toThrow(
        "Unable to parse a date argument that was required",
      );
      expect(replySpy).toHaveBeenCalledWith(
        "Can't parse date. Required: true. Error: Day not parseable",
      );
    });
  });
});
