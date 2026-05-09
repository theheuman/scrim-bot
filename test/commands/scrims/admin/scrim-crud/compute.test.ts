import {
  GuildMember,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  Message,
  MessagePayload,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { CustomInteraction } from "../../../../../src/commands/interaction";
import { AuthMock } from "../../../../mocks/auth.mock";
import { AuthService } from "../../../../../src/services/auth";
import { ComputeScrimCommand } from "../../../../../src/commands/scrims/admin/scrim-crud/compute-scrim";
import { ScrimServiceMock } from "../../../../mocks/scrim-service.mock";
import { ScrimService } from "../../../../../src/services/scrim-service";
import { DiscordServiceMock } from "../../../../mocks/discord-service.mock";
import { AlertService } from "../../../../../src/services/alert";
import { DiscordService } from "../../../../../src/services/discord";
import { OverstatServiceMock } from "../../../../mocks/overstat.mock";
import { OverstatService } from "../../../../../src/services/overstat";

describe("Compute scrim", () => {
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
  let signupComputeScrimSpy: SpyInstance<
    Promise<{ links: string[]; dateTime: Date }>,
    [channelId: string, overstatLinks: string[]],
    string
  >;
  let sendScoresComputedMessageSpy: SpyInstance;
  let getStringCallCount = 0;

  let command: ComputeScrimCommand;

  const mockScrimService = new ScrimServiceMock();
  const mockDiscordService = new DiscordServiceMock();
  const mockOverstatService = new OverstatServiceMock();
  const mockDateTime = new Date("2026-04-18");

  beforeAll(() => {
    member = {
      roles: {},
      user: {
        username: "TheHeuman",
      },
    } as GuildMember;
    basicInteraction = {
      channelId: "forum thread id",
      options: {
        getString: () => {
          let stringToReturn: string | null = null;
          if (getStringCallCount < 3) {
            stringToReturn = "overstat.link";
          }
          getStringCallCount++;
          return stringToReturn;
        },
      },
      reply: jest.fn(),
      editReply: jest.fn(),
      followUp: jest.fn(),
      deleteReply: jest.fn(),
      member,
    } as unknown as CustomInteraction;
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    followUpSpy = jest.spyOn(basicInteraction, "followUp");
    signupComputeScrimSpy = jest.spyOn(mockScrimService, "computeScrim");
    sendScoresComputedMessageSpy = jest.spyOn(
      mockDiscordService,
      "sendScoresComputedMessage",
    );
  });

  beforeEach(() => {
    editReplySpy.mockClear();
    followUpSpy.mockClear();
    signupComputeScrimSpy.mockReset();
    sendScoresComputedMessageSpy.mockReset();
    signupComputeScrimSpy.mockResolvedValue({
      links: ["overstat.link"],
      dateTime: mockDateTime,
    });
    sendScoresComputedMessageSpy.mockResolvedValue(undefined);
    command = new ComputeScrimCommand(
      { warn: jest.fn(), error: jest.fn() } as unknown as AlertService,
      new AuthMock() as AuthService,
      mockScrimService as unknown as ScrimService,
      mockDiscordService as unknown as DiscordService,
      mockOverstatService as unknown as OverstatService,
    );
    getStringCallCount = 0;
  });

  it("Should compute single scrim", async () => {
    getStringCallCount = 2;
    await command.run(basicInteraction);
    expect(signupComputeScrimSpy).toHaveBeenCalledWith("forum thread id", [
      "overstat.link",
    ]);
    expect(followUpSpy).toHaveBeenCalledWith(
      "1 scrim lobby successfully computed, you can now close the scrim",
    );
  });

  it("Should compute multiple scrims", async () => {
    signupComputeScrimSpy.mockResolvedValue({
      links: ["overstat.link", "overstat.link", "overstat.link"],
      dateTime: mockDateTime,
    });
    await command.run(basicInteraction);
    expect(signupComputeScrimSpy).toHaveBeenCalledWith("forum thread id", [
      "overstat.link",
      "overstat.link",
      "overstat.link",
    ]);
    expect(followUpSpy).toHaveBeenCalledWith(
      "3 scrim lobbies successfully computed, you can now close the scrim",
    );
  });

  it("Should send scores computed message after successful compute", async () => {
    getStringCallCount = 2;
    await command.run(basicInteraction);
    expect(sendScoresComputedMessageSpy).toHaveBeenCalledTimes(1);
    expect(sendScoresComputedMessageSpy).toHaveBeenCalledWith(mockDateTime, [
      { name: "Mock Lobby Name", link: "overstat.link" },
    ]);
  });

  it("Should warn if sending scores message fails but still complete", async () => {
    getStringCallCount = 2;
    sendScoresComputedMessageSpy.mockRejectedValue(
      new Error("Channel not found"),
    );
    await command.run(basicInteraction);
    expect(followUpSpy).toHaveBeenCalledWith(
      "1 scrim lobby successfully computed, you can now close the scrim",
    );
    expect(followUpSpy).toHaveBeenCalledWith(
      "Warning: Failed to send scores notification. Error: Channel not found",
    );
    expect(followUpSpy).toHaveBeenCalledTimes(2);
  });

  describe("errors", () => {
    it("should not compute scrim because the signup service errored", async () => {
      signupComputeScrimSpy.mockImplementation(() => {
        throw Error(
          "URL Malformated, make sure you are using the fully built url and not the shortcode",
        );
      });

      await command.run(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Scrim not computed. Error: URL Malformated, make sure you are using the fully built url and not the shortcode",
      );
    });
  });
});
