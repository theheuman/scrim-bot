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
import { RosterService } from "../../../../src/services/rosters";
import { DropoutCommand } from "../../../../src/commands/scrims/signup/droput-scrims";
import { AlertService } from "../../../../src/services/alert";
import { provideMagickalMock } from "../../../mocks/magickal-mock";

describe("Drop out name", () => {
  let basicInteraction: CustomInteraction;
  let member: GuildMember;
  let replySpy: SpyInstance<
    Promise<InteractionResponse<boolean>>,
    [reply: string | InteractionReplyOptions | MessagePayload],
    string
  >;
  let editReplySpy: SpyInstance<
    Promise<Message<boolean>>,
    [options: string | InteractionEditReplyOptions | MessagePayload],
    string
  >;
  let removeTeamSpy: SpyInstance<
    Promise<void>,
    [member: GuildMember, discordChannelId: string, teamName: string],
    string
  >;

  let command: DropoutCommand;

  const mockRosterService = provideMagickalMock(RosterService);

  beforeAll(() => {
    member = {
      roles: {},
      user: {
        username: "TheHeuman",
      },
    } as GuildMember;
    basicInteraction = {
      member,
      channelId: "forum thread id",
      deferReply: jest.fn(),
      editReply: jest.fn(),
      options: {
        getString: () => "team name",
      },
    } as unknown as CustomInteraction;
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    removeTeamSpy = jest.spyOn(mockRosterService, "removeSignup");
    removeTeamSpy.mockImplementation(() => Promise.resolve());
  });

  beforeEach(() => {
    editReplySpy.mockClear();
    removeTeamSpy.mockClear();
    command = new DropoutCommand(
      provideMagickalMock(AlertService),
      mockRosterService,
    );
  });

  it("Should dropout", async () => {
    await command.run(basicInteraction);
    expect(removeTeamSpy).toHaveBeenCalledWith(
      member,
      "forum thread id",
      "team name",
    );
    expect(editReplySpy).toHaveBeenCalledWith(
      `Team __team name__ has dropped from the signups.`,
    );
  });

  describe("errors", () => {
    it("should not dropout because the signup service had an error", async () => {
      removeTeamSpy.mockImplementationOnce(async () => {
        throw Error("DB Failure");
      });
      editReplySpy = jest.spyOn(basicInteraction, "editReply");
      await command.run(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Did NOT remove team from scrim. Error: DB Failure",
      );
    });

    it("should not dropout because member is null", async () => {
      const noMemberInteraction = {
        member: null,
        invisibleReply: jest.fn(),
      } as unknown as CustomInteraction;
      replySpy = jest.spyOn(
        noMemberInteraction,
        "invisibleReply",
      ) as SpyInstance<
        Promise<InteractionResponse<boolean>>,
        [reply: string | InteractionReplyOptions | MessagePayload],
        string
      >;
      await command.run(noMemberInteraction);
      expect(replySpy).toHaveBeenCalledWith(
        "Did NOT remove team from scrim. Member issuing command not found",
      );
    });
  });
});
