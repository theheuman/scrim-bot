import {
  ChatInputCommandInteraction,
  InteractionReplyOptions,
  InteractionResponse,
  MessagePayload,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { CustomInteraction } from "../../src/commands/interaction";

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
      reply: jest.fn(),
      member: {
        roles: [],
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
    const customInteraction = new CustomInteraction(basicInteraction);
    const date = customInteraction.options.getDateTime("date");
    expect(date).toEqual(new Date("2024-11-15T00:00:00-05:00"));
  });

  it("Should return a correct date when no space between time and pm", async () => {
    dateTimeString = "1/4 8pm";
    jest.setSystemTime(new Date("2025-01-03"));
    const customInteraction = new CustomInteraction(basicInteraction);
    const date = customInteraction.options.getDateTime("date");
    expect(date).toEqual(new Date("2025-01-04T20:00:00-05:00"));
  });

  it("Should return a correct date when no space between time with minutes and am", async () => {
    dateTimeString = "1/4 8:30am";
    jest.setSystemTime(new Date("2025-01-03"));
    const customInteraction = new CustomInteraction(basicInteraction);
    const date = customInteraction.options.getDateTime("date");
    expect(date).toEqual(new Date("2025-01-04T08:30:00-05:00"));
  });

  it("should return null when date is not required and string does not exist", async () => {
    dateTimeString = null as unknown as string;
    const customInteraction = new CustomInteraction(basicInteraction);
    const date = customInteraction.options.getDateTime("date");
    expect(date).toEqual(null);
  });

  it("Should set scrim date in January", async () => {
    jest.setSystemTime(new Date("2024-12-2"));
    dateTimeString = "1/1";
    const customInteraction = new CustomInteraction(basicInteraction);
    const date = customInteraction.options.getDateTime("date");
    expect(date).toEqual(new Date("2025-01-01T00:00:00-05:00"));
  });

  it("Should set scrim for a normal am hour", async () => {
    jest.setSystemTime(new Date("2024-12-2"));
    dateTimeString = "12/3/24 10 am";
    const customInteraction = new CustomInteraction(basicInteraction);
    const date = customInteraction.options.getDateTime("date");
    expect(date).toEqual(new Date("2024-12-03T10:00:00-05:00"));
  });

  it("Should set scrim date correctly when full year provided", async () => {
    jest.setSystemTime(new Date("2025-02-12"));
    dateTimeString = "02/12/2025 10 am";
    const customInteraction = new CustomInteraction(basicInteraction);
    const date = customInteraction.options.getDateTime("date");
    expect(date).toEqual(new Date("2025-02-12T10:00:00-05:00"));
  });

  it("Should set scrim for 12:30 pm", async () => {
    jest.setSystemTime(new Date("2024-12-2"));
    dateTimeString = "12/3 12:30 pm";
    const customInteraction = new CustomInteraction(basicInteraction);
    const date = customInteraction.options.getDateTime("date");
    expect(date).toEqual(new Date("2024-12-03T12:30:00-05:00"));
  });

  it("Should set scrim for normal pm hour", async () => {
    jest.setSystemTime(new Date("2024-12-2"));
    dateTimeString = "12/3 10:30 pm";
    const customInteraction = new CustomInteraction(basicInteraction);
    const date = customInteraction.options.getDateTime("date");
    expect(date).toEqual(new Date("2024-12-03T22:30:00-05:00"));
  });

  describe("errors", () => {
    it("should throw error when date is not required and string exists", async () => {
      replySpy.mockClear();
      dateTimeString = "lol/12";
      const customInteraction = new CustomInteraction(basicInteraction);
      const expectErrors = () => {
        customInteraction.options.getDateTime("date");
      };
      expect(expectErrors).toThrow(
        'Can\'t parse "date". Error: Month not valid; Expected format: mm/dd/yy hh:mm pm',
      );
    });

    it("should throw error when date is required", async () => {
      replySpy.mockClear();
      dateTimeString = "11/no";
      const customInteraction = new CustomInteraction(basicInteraction);
      const expectErrors = () => {
        customInteraction.options.getDateTime("date");
      };
      expect(expectErrors).toThrow(
        'Can\'t parse "date". Error: Day not valid; Expected format: mm/dd/yy hh:mm pm',
      );
    });

    describe("invalid time", () => {
      it("Should not create scrim because of invalid hour", async () => {
        replySpy.mockClear();
        jest.setSystemTime(new Date("2024-12-2"));
        dateTimeString = "12/3 13:00 pm";
        const customInteraction = new CustomInteraction(basicInteraction);

        const expectErrors = () => {
          customInteraction.options.getDateTime("date");
        };
        expect(expectErrors).toThrow(
          'Can\'t parse "date". Error: Hour not valid; Expected format: mm/dd/yy hh:mm pm',
        );
      });

      it("Should not create scrim because of invalid minute", async () => {
        replySpy.mockClear();
        jest.setSystemTime(new Date("2024-12-2"));
        dateTimeString = "12/3 8:60 pm";
        const customInteraction = new CustomInteraction(basicInteraction);

        const expectErrors = () => {
          customInteraction.options.getDateTime("date");
        };
        expect(expectErrors).toThrow(
          'Can\'t parse "date". Error: Minute not valid; Expected format: mm/dd/yy hh:mm pm',
        );
      });

      it("Should not create scrim because of invalid ampm label", async () => {
        replySpy.mockClear();
        jest.setSystemTime(new Date("2024-12-2"));
        dateTimeString = "12/3 8:00 xm";
        const customInteraction = new CustomInteraction(basicInteraction);

        const expectErrors = () => {
          customInteraction.options.getDateTime("date");
        };
        expect(expectErrors).toThrow(
          'Can\'t parse "date". Error: am/pm label not valid; Expected format: mm/dd/yy hh:mm pm',
        );
      });
    });
  });
});
