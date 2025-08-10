import {
  GuildMember,
  InteractionReplyOptions,
  Message,
  MessagePayload,
  Snowflake,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { CustomInteraction } from "../../../../src/commands/interaction";
import { AuthMock } from "../../../mocks/auth.mock";
import { AuthService } from "../../../../src/services/auth";
import { BanServiceMock } from "../../../mocks/ban.mock";
import { BanService } from "../../../../src/services/ban";
import { ExpungeBanCommand } from "../../../../src/commands/admin/bans/expunge-ban";

describe("Expunge ban", () => {
  // this is supposed to be a Snowflake but I don't want to mock it strings work just fine
  const channelId = "some id" as unknown as Snowflake;
  let basicInteraction: CustomInteraction;
  let singleIdInteraction: CustomInteraction;
  let expungeBanSpy: SpyInstance<
    Promise<
      { playerDiscordId: string; playerDisplayName: string; endDate: Date }[]
    >,
    [banIds: string[]],
    string
  >;
  let member: GuildMember;
  const banDbId = "ban db id";
  let followUpSpy: SpyInstance<
    Promise<Message<boolean>>,
    [reply: string | InteractionReplyOptions | MessagePayload],
    string
  >;
  let command: ExpungeBanCommand;

  const mockBanService = new BanServiceMock() as BanService;
  const mockAuth = new AuthMock() as AuthService;

  beforeAll(() => {
    member = {
      roles: {},
    } as GuildMember;
    basicInteraction = {
      options: {
        getString: () => banDbId,
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
            return "banId";
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

    expungeBanSpy = jest.spyOn(mockBanService, "expungeBans");
    expungeBanSpy.mockClear();
    expungeBanSpy.mockReturnValue(Promise.resolve([]));
    command = new ExpungeBanCommand(mockAuth, mockBanService);
  });

  it("Should expunge bans for multiple users", async () => {
    const endDate = new Date("2024-12-14");
    expungeBanSpy.mockImplementation((banIds: string[]) => {
      expect(banIds).toEqual([banDbId, banDbId, banDbId]);
      return Promise.resolve([
        {
          playerDisplayName: "TheHeuman",
          playerDiscordId: "discordid",
          endDate,
        },
        {
          playerDisplayName: "Oalios",
          playerDiscordId: "discordid2",
          endDate,
        },
        {
          playerDisplayName: "Stinkerson",
          playerDiscordId: "discordid3",
          endDate,
        },
      ]);
    });

    followUpSpy = jest.spyOn(basicInteraction, "followUp");
    followUpSpy.mockClear();
    await command.run(basicInteraction);
    expect(followUpSpy).toHaveBeenCalledWith(
      `Expunged ban on player <@discordid> (TheHeuman) that was set to end on <t:1734134400:f>\nExpunged ban on player <@discordid2> (Oalios) that was set to end on <t:1734134400:f>\nExpunged ban on player <@discordid3> (Stinkerson) that was set to end on <t:1734134400:f>`,
    );
    // if this is failing, and you haven't changed the amount of assertions take a look a little higher in the log to see if the expungeBanSpy was called with differing values
    expect.assertions(2);
  });

  it("Should expunge ban for one user", async () => {
    const endDate = new Date("2024-12-14");
    expungeBanSpy.mockReturnValueOnce(
      Promise.resolve([
        {
          playerDisplayName: "TheHeuman",
          playerDiscordId: "discordid",
          endDate,
        },
      ]),
    );

    followUpSpy = jest.spyOn(singleIdInteraction, "followUp");
    followUpSpy.mockClear();
    await command.run(singleIdInteraction);
    expect(followUpSpy).toHaveBeenCalledWith(
      `Expunged ban on player <@discordid> (TheHeuman) that was set to end on <t:1734134400:f>`,
    );
    expect(expungeBanSpy).toHaveBeenCalledWith([banDbId, banDbId, banDbId]);
  });

  describe("errors", () => {
    it("should reply with an error when db fails", async () => {
      const editReplySpy = jest.spyOn(basicInteraction, "editReply");
      editReplySpy.mockClear();
      expungeBanSpy.mockImplementation(() => {
        throw new Error("DB failed");
      });
      await command.run(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Error while executing expunge ban. Error: DB failed",
      );
    });
  });
});
