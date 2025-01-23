import {
  GuildMember,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  InteractionResponse,
  Message,
  MessagePayload,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { CustomInteraction } from "../../../../src/commands/interaction";
import { AuthMock } from "../../../mocks/auth.mock";
import { AuthService } from "../../../../src/services/auth";
import { ScrimSignupMock } from "../../../mocks/signups.mock";
import { ScrimSignups } from "../../../../src/services/signups";
import { ComputeScrimCommand } from "../../../../src/commands/admin/scrim-crud/compute-scrim";

describe("Close scrim", () => {
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
    Promise<void>,
    [channelId: string, overstatLink: string, skill: number],
    string
  >;

  let command: ComputeScrimCommand;

  const mockScrimSignups = new ScrimSignupMock();

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
        getString: () => "overstat.link",
        getNumber: () => 1,
      },
      reply: jest.fn(),
      editReply: jest.fn(),
      followUp: jest.fn(),
      deleteReply: jest.fn(),
      member,
    } as unknown as CustomInteraction;
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    followUpSpy = jest.spyOn(basicInteraction, "followUp");
    signupComputeScrimSpy = jest.spyOn(mockScrimSignups, "computeScrim");
    signupComputeScrimSpy.mockImplementation(() => {
      return Promise.resolve();
    });
  });

  beforeEach(() => {
    editReplySpy.mockClear();
    followUpSpy.mockClear();
    signupComputeScrimSpy.mockClear();
    command = new ComputeScrimCommand(
      new AuthMock() as AuthService,
      mockScrimSignups as unknown as ScrimSignups,
    );
  });

  it("Should compute scrim", async () => {
    await command.run(basicInteraction);
    expect(signupComputeScrimSpy).toHaveBeenCalledWith(
      "forum thread id",
      "overstat.link",
      1,
    );
    expect(followUpSpy).toHaveBeenCalledWith(
      "Scrim lobby successfully computed, you can now compute another lobby or close the scrim",
    );
    jest.useRealTimers();
  });

  describe("errors", () => {
    it("should not compute scrim because the overstat link is invalid", async () => {
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
