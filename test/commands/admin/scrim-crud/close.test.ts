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
import { CreateScrimCommand } from "../../../../src/commands/admin/scrim-crud/create-scrim";
import { AuthMock } from "../../../mocks/auth.mock";
import { AuthService } from "../../../../src/services/auth";
import { ScrimSignupMock } from "../../../mocks/signups.mock";
import { ScrimSignups } from "../../../../src/services/signups";
import { StaticValueServiceMock } from "../../../mocks/static-values.mock";
import { StaticValueService } from "../../../../src/services/static-values";
import { ChannelType } from "discord-api-types/v10";
import { CloseScrimCommand } from "../../../../src/commands/admin/scrim-crud/close-scrim";

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

  const mockScrimSignups = new ScrimSignupMock();

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
      reply: (message: string) => {
        console.log("Replying to command with:", message);
      },
      editReply: (message: string) => {
        console.log("Editing reply to:", message);
      },
      member,
    } as unknown as CustomInteraction;
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    signupCloseScrimSpy = jest.spyOn(mockScrimSignups, "closeScrim");
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
      mockScrimSignups as unknown as ScrimSignups,
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
    it("should not close scrim because the channel provided is not a valid scrim", async () => {
      signupCloseScrimSpy.mockImplementation(() => {
        throw Error("No scrim found for that channel");
      });

      await command.run(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Scrim not closed. Error: No scrim found for that channel",
      );
      expect(channelDeletedSpy).not.toHaveBeenCalled();
    });
  });
});
