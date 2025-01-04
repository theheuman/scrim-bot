import {
  ChatInputCommandInteraction,
  InteractionReplyOptions,
  InteractionResponse,
  MessagePayload,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { getCustomOptions } from "../../src/commands/interaction";

describe("Custom interaction", () => {
  let basicInteraction: ChatInputCommandInteraction;

  let replySpy: SpyInstance<
    Promise<InteractionResponse<boolean>>,
    [reply: string | InteractionReplyOptions | MessagePayload],
    string
  >;

  let dateTimeString = "11/15";

  beforeAll(() => {
    basicInteraction = {
      options: {
        getString: () => {
          return dateTimeString;
        },
      },
      reply: (message: string) => {
        console.log("Basic replying to command with:", message);
      },
    } as unknown as ChatInputCommandInteraction;

    replySpy = jest.spyOn(basicInteraction, "reply");
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
    const customOptions = getCustomOptions(basicInteraction);
    const date = customOptions.getDateTime("date");
    expect(date).toEqual(new Date("2024-11-15T00:00:00-05:00"));
  });

  it("Should return a correct date for january while in january", async () => {
    dateTimeString = "1/4 8 pm";
    jest.setSystemTime(new Date("2025-01-03"));
    const customOptions = getCustomOptions(basicInteraction);
    const date = customOptions.getDateTime("date");
    expect(date).toEqual(new Date("2025-01-04T20:00:00-05:00"));
  });

  it("should return null when date is not required and string does not exist", async () => {
    dateTimeString = null as unknown as string;
    const customOptions = getCustomOptions(basicInteraction);
    const date = customOptions.getDateTime("date");
    expect(date).toEqual(null);
  });

  it("Should set scrim date in January", async () => {
    jest.setSystemTime(new Date("2024-12-2"));
    dateTimeString = "1/1";
    const customOptions = getCustomOptions(basicInteraction);
    const date = customOptions.getDateTime("date");
    expect(date).toEqual(new Date("2025-01-01T00:00:00-05:00"));
  });

  it("Should set scrim for a normal am hour", async () => {
    jest.setSystemTime(new Date("2024-12-2"));
    dateTimeString = "12/3/24 10 am";
    const customOptions = getCustomOptions(basicInteraction);
    const date = customOptions.getDateTime("date");
    expect(date).toEqual(new Date("2024-12-03T10:00:00-05:00"));
  });

  it("Should set scrim for 12:30 pm", async () => {
    jest.setSystemTime(new Date("2024-12-2"));
    dateTimeString = "12/3 12:30 pm";
    const customOptions = getCustomOptions(basicInteraction);
    const date = customOptions.getDateTime("date");
    expect(date).toEqual(new Date("2024-12-03T12:30:00-05:00"));
  });

  it("Should set scrim for normal pm hour", async () => {
    jest.setSystemTime(new Date("2024-12-2"));
    dateTimeString = "12/3 10:30 pm";
    const customOptions = getCustomOptions(basicInteraction);
    const date = customOptions.getDateTime("date");
    expect(date).toEqual(new Date("2024-12-03T22:30:00-05:00"));
  });

  describe("errors", () => {
    it("should throw error when date is not required and string exists", async () => {
      replySpy.mockClear();
      dateTimeString = "lol/12";
      const customOptions = getCustomOptions(basicInteraction);
      const expectErrors = () => {
        customOptions.getDateTime("date");
      };
      expect(expectErrors).toThrow(
        "Unable to parse a date argument that was supplied",
      );
      expect(replySpy).toHaveBeenCalledWith(
        "Can't parse date. Error: Month not valid; Expected format: mm/dd/yy hh:mm pm",
      );
    });

    it("should throw error when date is required", async () => {
      replySpy.mockClear();
      dateTimeString = "11/no";
      const customOptions = getCustomOptions(basicInteraction);
      const expectErrors = () => {
        customOptions.getDateTime("date", true);
      };
      expect(expectErrors).toThrow(
        "Unable to parse a date argument that was required",
      );
      expect(replySpy).toHaveBeenCalledWith(
        "Can't parse date. Required. Error: Day not valid; Expected format: mm/dd/yy hh:mm pm",
      );
    });

    describe("invalid time", () => {
      it("Should not create scrim because of invalid hour", async () => {
        replySpy.mockClear();
        jest.setSystemTime(new Date("2024-12-2"));
        dateTimeString = "12/3 13:00 pm";
        const customOptions = getCustomOptions(basicInteraction);

        const expectErrors = () => {
          customOptions.getDateTime("date", true);
        };
        expect(expectErrors).toThrow(
          "Unable to parse a date argument that was required",
        );
        expect(replySpy).toHaveBeenCalledWith(
          "Can't parse date. Required. Error: Hour not valid; Expected format: mm/dd/yy hh:mm pm",
        );
      });

      it("Should not create scrim because of invalid minute", async () => {
        replySpy.mockClear();
        jest.setSystemTime(new Date("2024-12-2"));
        dateTimeString = "12/3 8:60 pm";
        const customOptions = getCustomOptions(basicInteraction);

        const expectErrors = () => {
          customOptions.getDateTime("date");
        };
        expect(expectErrors).toThrow(
          "Unable to parse a date argument that was supplied",
        );
        expect(replySpy).toHaveBeenCalledWith(
          "Can't parse date. Error: Minute not valid; Expected format: mm/dd/yy hh:mm pm",
        );
      });

      it("Should not create scrim because of invalid ampm label", async () => {
        replySpy.mockClear();
        jest.setSystemTime(new Date("2024-12-2"));
        dateTimeString = "12/3 8:00 xm";
        const customOptions = getCustomOptions(basicInteraction);

        const expectErrors = () => {
          customOptions.getDateTime("date", true);
        };
        expect(expectErrors).toThrow(
          "Unable to parse a date argument that was required",
        );
        expect(replySpy).toHaveBeenCalledWith(
          "Can't parse date. Required. Error: am/pm label not valid; Expected format: mm/dd/yy hh:mm pm",
        );
      });
    });
  });
});
