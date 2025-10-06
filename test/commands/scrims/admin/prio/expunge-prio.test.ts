import {
  GuildMember,
  InteractionReplyOptions,
  Message,
  MessagePayload,
  Snowflake,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { ExpungedPlayerPrio } from "../../../../../src/models/Prio";
import { CustomInteraction } from "../../../../../src/commands/interaction";
import { ExpungePrioCommand } from "../../../../../src/commands/scrims/admin/prio/expunge-prio";
import { PrioServiceMock } from "../../../../mocks/prio.mock";
import { PrioService } from "../../../../../src/services/prio";
import { AuthMock } from "../../../../mocks/auth.mock";
import { AuthService } from "../../../../../src/services/auth";

describe("Expunge prio", () => {
  // this is supposed to be a Snowflake but I don't want to mock it strings work just fine
  const channelId = "some id" as unknown as Snowflake;
  let basicInteraction: CustomInteraction;
  let singleIdInteraction: CustomInteraction;
  let expungePrioSpy: SpyInstance<
    Promise<ExpungedPlayerPrio[]>,
    [prioIds: string[]],
    string
  >;
  let member: GuildMember;
  const prioDbId = "prio db id";
  let followUpSpy: SpyInstance<
    Promise<Message<boolean>>,
    [reply: string | InteractionReplyOptions | MessagePayload],
    string
  >;
  let command: ExpungePrioCommand;

  const mockPrioService = new PrioServiceMock() as PrioService;
  const mockAuth = new AuthMock() as AuthService;

  beforeAll(() => {
    member = {
      roles: {},
    } as GuildMember;
    basicInteraction = {
      options: {
        getString: () => prioDbId,
      },
      invisibleReply: jest.fn(),
      editReply: jest.fn(),
      followUp: jest.fn(),
      deleteReply: jest.fn(),
      channelId,
      member,
    } as unknown as CustomInteraction;

    let singleUserInteractionGetStringCount = 0;

    singleIdInteraction = {
      options: {
        getString: () => {
          if (singleUserInteractionGetStringCount === 0) {
            singleUserInteractionGetStringCount++;
            return "prioId";
          }
        },
      },
      invisibleReply: jest.fn(),
      editReply: jest.fn(),
      followUp: jest.fn(),
      deleteReply: jest.fn(),
      channelId,
      member,
    } as unknown as CustomInteraction;
    followUpSpy = jest.spyOn(basicInteraction, "followUp");
    followUpSpy.mockClear();

    expungePrioSpy = jest.spyOn(mockPrioService, "expungePlayerPrio");
    expungePrioSpy.mockClear();
    expungePrioSpy.mockReturnValue(Promise.resolve([]));
    command = new ExpungePrioCommand(mockAuth, mockPrioService);
  });

  it("Should expunge prio for multiple users", async () => {
    const endDate = new Date("2024-12-14");
    expungePrioSpy.mockImplementation((prioIds: string[]) => {
      expect(prioIds).toEqual([prioDbId, prioDbId, prioDbId]);
      return Promise.resolve([
        {
          playerDisplayName: "TheHeuman",
          playerDiscordId: "discordid",
          amount: -400,
          endDate,
        },
        {
          playerDisplayName: "Oalios",
          playerDiscordId: "discordid2",
          amount: -4,
          endDate,
        },
        {
          playerDisplayName: "Stinkerson",
          playerDiscordId: "discordid3",
          amount: 4,
          endDate,
        },
      ]);
    });

    followUpSpy = jest.spyOn(basicInteraction, "followUp");
    followUpSpy.mockClear();
    await command.run(basicInteraction);
    // Hi Ali, this is what I expect the end reply to be.
    // It includes the prio amount, the player discord id and display name, and its end date in discord timestamp format.
    // To get the timestamp from a date you can use the formatDate() method built in to the command parent class
    expect(followUpSpy).toHaveBeenCalledWith(
      `Expunged prio of -400 on player <@discordid> (TheHeuman) that was set to end on <t:1734134400:f>\nExpunged prio of -4 on player <@discordid2> (Oalios) that was set to end on <t:1734134400:f>\nExpunged prio of 4 on player <@discordid3> (Stinkerson) that was set to end on <t:1734134400:f>`,
    );
    // if this is failing, and you haven't changed the amount of assertions take a look a little higher in the log to see if the setPlayerPrioSpy was called with differing values
    expect.assertions(2);
  });

  it("Should expunge prio for one user", async () => {
    const endDate = new Date("2024-12-14");
    expungePrioSpy.mockReturnValueOnce(
      Promise.resolve([
        {
          playerDisplayName: "TheHeuman",
          playerDiscordId: "discordid",
          amount: -400,
          endDate,
        },
      ]),
    );

    followUpSpy = jest.spyOn(singleIdInteraction, "followUp");
    followUpSpy.mockClear();
    await command.run(singleIdInteraction);
    // Hi Ali, this is what I expect the end reply to be.
    // It includes the prio amount, the player discord id and display name, and its end date in discord timestamp format.
    // To get the timestamp from a date you can use the formatDate() method built in to the command parent class
    expect(followUpSpy).toHaveBeenCalledWith(
      `Expunged prio of -400 on player <@discordid> (TheHeuman) that was set to end on <t:1734134400:f>`,
    );
    expect(expungePrioSpy).toHaveBeenCalledWith([prioDbId, prioDbId, prioDbId]);
  });

  describe("errors", () => {
    it("should reply with an error when db fails", async () => {
      const editReplySpy = jest.spyOn(basicInteraction, "editReply");
      editReplySpy.mockClear();
      expungePrioSpy.mockImplementation(() => {
        throw new Error("DB failed");
      });
      await command.run(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Error while executing expunge prio. Error: DB failed",
      );
    });
  });
});
