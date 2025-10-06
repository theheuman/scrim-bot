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
import { ScrimSignupMock } from "../../../../mocks/signups.mock";
import { ScrimSignups } from "../../../../../src/services/signups";
import { ComputeScrimCommand } from "../../../../../src/commands/scrims/admin/scrim-crud/compute-scrim";

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
    Promise<string[]>,
    [channelId: string, overstatLinks: string[]],
    string
  >;
  let getStringCallCount = 0;

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
    signupComputeScrimSpy = jest.spyOn(mockScrimSignups, "computeScrim");
    signupComputeScrimSpy.mockReturnValue(Promise.resolve(["overstat.link"]));
  });

  beforeEach(() => {
    editReplySpy.mockClear();
    followUpSpy.mockClear();
    signupComputeScrimSpy.mockClear();
    command = new ComputeScrimCommand(
      new AuthMock() as AuthService,
      mockScrimSignups as unknown as ScrimSignups,
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
    jest.useRealTimers();
  });

  it("Should compute multiple scrims", async () => {
    signupComputeScrimSpy.mockReturnValue(
      Promise.resolve(["overstat.link", "overstat.link", "overstat.link"]),
    );
    await command.run(basicInteraction);
    expect(signupComputeScrimSpy).toHaveBeenCalledWith("forum thread id", [
      "overstat.link",
      "overstat.link",
      "overstat.link",
    ]);
    expect(followUpSpy).toHaveBeenCalledWith(
      "3 scrim lobbies successfully computed, you can now close the scrim",
    );
    jest.useRealTimers();
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
