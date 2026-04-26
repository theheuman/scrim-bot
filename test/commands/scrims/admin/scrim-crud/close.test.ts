import {
  GuildMember,
  InteractionEditReplyOptions,
  Message,
  MessagePayload,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { CustomInteraction } from "../../../../../src/commands/interaction";
import { AuthMock } from "../../../../mocks/auth.mock";
import { AuthService } from "../../../../../src/services/auth";
import { CloseScrimCommand } from "../../../../../src/commands/scrims/admin/scrim-crud/close-scrim";
import { ScrimService } from "../../../../../src/services/scrim-service";
import { ScrimServiceMock } from "../../../../mocks/scrim-service.mock";

describe("Close scrim", () => {
  let basicInteraction: CustomInteraction;
  let member: GuildMember;
  let editReplySpy: SpyInstance<
    Promise<Message<boolean>>,
    [options: string | InteractionEditReplyOptions | MessagePayload],
    string
  >;
  let signupCloseScrimSpy: SpyInstance<
    Promise<void>,
    [channelId: string],
    string
  >;
  const channelDeletedSpy = jest.fn();

  let command: CloseScrimCommand;

  const mockScrimService = new ScrimServiceMock();

  beforeAll(() => {
    member = {
      roles: {},
      user: {
        username: "TheHeuman",
      },
    } as GuildMember;
    basicInteraction = {
      channel: {
        delete: channelDeletedSpy,
        id: "forum thread id",
      },
      reply: jest.fn(),
      editReply: jest.fn(),
      member,
    } as unknown as CustomInteraction;
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    signupCloseScrimSpy = jest.spyOn(mockScrimService, "closeScrim");
    signupCloseScrimSpy.mockImplementation(() => {
      return Promise.resolve();
    });
  });

  beforeEach(() => {
    editReplySpy.mockClear();
    signupCloseScrimSpy.mockClear();
    channelDeletedSpy.mockClear();
    command = new CloseScrimCommand(
      new AuthMock() as AuthService,
      mockScrimService as unknown as ScrimService,
    );
  });

  it("Should close scrim", async () => {
    jest.useFakeTimers();
    await command.run(basicInteraction);
    expect(signupCloseScrimSpy).toHaveBeenCalledWith("forum thread id");
    expect(editReplySpy).toHaveBeenCalledWith(
      "Scrim closed. Deleting this channel in 5 seconds",
    );
    jest.runAllTimers();
    expect(channelDeletedSpy).toHaveBeenCalledWith("Scrim closed by TheHeuman");
    jest.useRealTimers();
  });

  describe("errors", () => {
    it("should not close scrim because the channel provided is null", async () => {
      const badInteraction = {
        channel: null,
        editReply: jest.fn(),
      } as unknown as CustomInteraction;
      editReplySpy = jest.spyOn(badInteraction, "editReply");
      await command.run(badInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Scrim not closed. Could not get channel this command was sent in. null",
      );
      expect(signupCloseScrimSpy).not.toHaveBeenCalled();
      expect(channelDeletedSpy).not.toHaveBeenCalled();
    });

    it("should not close scrim because the channel provided is not a valid scrim", async () => {
      signupCloseScrimSpy.mockImplementation(() => {
        throw Error("No scrim found for that channel");
      });

      editReplySpy = jest.spyOn(basicInteraction, "editReply");
      await command.run(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Scrim not closed. Error: No scrim found for that channel",
      );
      expect(channelDeletedSpy).not.toHaveBeenCalled();
    });
  });
});
