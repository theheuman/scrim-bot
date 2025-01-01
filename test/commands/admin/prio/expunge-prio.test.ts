import {
  GuildMember,
  InteractionReplyOptions,
  InteractionResponse,
  MessagePayload,
  Snowflake,
} from "discord.js";
import { prioService } from "../../../../src/services";
import SpyInstance = jest.SpyInstance;
import { ExpungedPlayerPrio } from "../../../../src/models/Prio";
import { CustomInteraction } from "../../../../src/commands/interaction";
import { ExpungePrioCommand } from "../../../../src/commands/admin/prio/expunge-prio";

describe("Expunge prio", () => {
  // this is supposed to be a Snowflake but I don't want to mock it strings work just fine
  const channelId = "some id" as unknown as Snowflake;
  let basicInteraction: CustomInteraction;
  let expungePrioSpy: SpyInstance<
    Promise<ExpungedPlayerPrio[]>,
    [prioIds: string[]],
    string
  >;
  let member: GuildMember;
  const prioDbId = "prio db id";
  let replySpy: SpyInstance<
    Promise<InteractionResponse<boolean>>,
    [reply: string | InteractionReplyOptions | MessagePayload],
    string
  >;
  let command: ExpungePrioCommand;

  beforeAll(() => {
    member = {
      roles: {},
    } as GuildMember;
    basicInteraction = {
      options: {
        getString: () => prioDbId,
      },
      reply: (message: string) => {
        console.log("Replying to command with:", message);
      },
      channelId,
      member,
    } as unknown as CustomInteraction;
    expungePrioSpy = jest.spyOn(prioService, "expungePlayerPrio");
    expungePrioSpy.mockClear();
    expungePrioSpy.mockReturnValue(Promise.resolve([]));
    command = new ExpungePrioCommand(prioService);
  });

  it("Should expunge prio", async () => {
    const endDate = new Date("24-12-14");
    expungePrioSpy.mockImplementation((prioIds: string[]) => {
      expect(prioIds).toEqual([prioDbId]);
      return Promise.resolve([
        {
          playerDisplayName: "TheHeuman",
          playerDiscordId: "discordId",
          amount: -400,
          endDate,
        },
      ]);
    });

    replySpy = jest.spyOn(basicInteraction, "reply");
    await command.run(basicInteraction);
    // Hi Ali, this is what I expect the end reply to be.
    // It includes the prio amount, the player discord id and display name, and its end date in discord timestamp format.
    // To get the timestamp from a date you can use the formatDate() method built in to the command parent class
    expect(replySpy).toHaveBeenCalledWith(
      `Expunged prio of -400 on player <@discordid> (TheHeuman) that was set to end on <t:1734214260:d>`,
    );
    // if this is failing, and you haven't changed the amount of assertions take a look a little higher in the log to see if the setPlayerPrioSpy was called with differing values
    expect.assertions(2);
  });

  describe("errors", () => {
    it("should reply with an error when db fails", async () => {
      expungePrioSpy.mockImplementation(() => {
        throw new Error("DB failed");
      });
      replySpy = jest.spyOn(basicInteraction, "reply");
      await command.run(basicInteraction);
      expect(replySpy).toHaveBeenCalledWith(
        "Command failed. Error: DB failed.",
      );
    });
  });
});
