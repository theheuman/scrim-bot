import {
  ChatInputCommandInteraction,
  GuildMember,
  InteractionReplyOptions,
  InteractionResponse,
  MessagePayload,
  Snowflake,
} from "discord.js";
import { prioService } from "../../../../src/services";
import SpyInstance = jest.SpyInstance;
import { ExpungedPlayerPrio } from "../../../../src/models/Prio";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const expungePrioCommand = require("../../../../src/commands/admin/prio/expunge-prio");

describe("Expunge prio", () => {
  // this is supposed to be a Snowflake but I don't want to mock it strings work just fine
  const channelId = "some id" as unknown as Snowflake;
  let basicInteraction: ChatInputCommandInteraction;
  let noMemberInteraction: ChatInputCommandInteraction;
  let expungePrioSpy: SpyInstance<
    Promise<ExpungedPlayerPrio[]>,
    [memberUsingCommand: GuildMember, prioIds: string[]],
    string
  >;
  let member: GuildMember;
  const prioDbId = "prio db id";
  let replySpy: SpyInstance<
    Promise<InteractionResponse<boolean>>,
    [reply: string | InteractionReplyOptions | MessagePayload],
    string
  >;

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
    } as unknown as ChatInputCommandInteraction;
    noMemberInteraction = {
      options: {
        getString: () => prioDbId,
      },
      reply: (message: string) => {
        console.log("Replying to command with:", message);
      },
      channelId,
    } as unknown as ChatInputCommandInteraction;
    expungePrioSpy = jest.spyOn(prioService, "expungePlayerPrio");
    expungePrioSpy.mockClear();
    expungePrioSpy.mockReturnValue(Promise.resolve([]));
  });

  it("Should expunge prio", async () => {
    const endDate = new Date("24-12-14");
    expungePrioSpy.mockImplementation(
      (memberUsingCommand: GuildMember, prioIds: string[]) => {
        expect(memberUsingCommand).toEqual(member);
        expect(prioIds).toEqual([prioDbId]);
        return Promise.resolve([
          {
            playerDisplayName: "TheHeuman",
            playerDiscordId: "discordId",
            amount: -400,
            endDate,
          },
        ]);
      },
    );

    replySpy = jest.spyOn(basicInteraction, "reply");
    await expungePrioCommand.execute(basicInteraction);
    // Hi Ali, this is what I expect the end reply to be.
    // It includes the prio amount, the player discord id and display name, and its end date in discord timestamp format.
    // To get the timestamp from a date you can do date.valueOf(), but discord expects it in seconds instead of milliseconds so you'll have to divide by 1000 and floor it
    expect(replySpy).toHaveBeenCalledWith(
      `Expunged prio of -400 on player <@discordid> (TheHeuman) that was set to end on <t:1734214260:d>`,
    );
    // if this is failing, and you haven't changed the amount of assertions take a look a little higher in the log to see if the setPlayerPrioSpy was called with differing values
    expect.assertions(3);
  });

  describe("errors", () => {
    it("should not expunge prio member does not have roles", async () => {
      expungePrioSpy.mockClear();
      replySpy = jest.spyOn(noMemberInteraction, "reply");
      await expungePrioCommand.execute(noMemberInteraction);
      expect(replySpy).toHaveBeenCalledWith(
        "Can't find the member issuing the command or this is an api command, no command executed",
      );
      expect(expungePrioSpy).not.toHaveBeenCalled();
    });
  });
});
