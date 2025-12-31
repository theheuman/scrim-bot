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
import { RosterServiceMock } from "../../../mocks/roster.mock";
import { RosterService } from "../../../../src/services/rosters";
import { ChangeTeamNameCommand } from "../../../../src/commands/scrims/signup/change-team-name";

describe("Change team name", () => {
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
  let rosterServiceChangeNameSpy: SpyInstance<
    Promise<void>,
    [
      member: GuildMember,
      discordChannelId: string,
      oldTeamName: string,
      newTeamName: string,
    ],
    string
  >;

  let command: ChangeTeamNameCommand;

  const mockRosterService = new RosterServiceMock();

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
      reply: jest.fn(),
      editReply: jest.fn(),
      options: {
        getString: (key: string) =>
          key === "old-team-name" ? "old team name" : "new team name",
      },
    } as unknown as CustomInteraction;
    replySpy = jest.spyOn(basicInteraction, "reply");
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    rosterServiceChangeNameSpy = jest.spyOn(
      mockRosterService,
      "changeTeamName",
    );
    rosterServiceChangeNameSpy.mockImplementation(() => Promise.resolve());
  });

  beforeEach(() => {
    replySpy.mockClear();
    editReplySpy.mockClear();
    rosterServiceChangeNameSpy.mockClear();
    command = new ChangeTeamNameCommand(
      mockRosterService as unknown as RosterService,
    );
  });

  it("Should change team name", async () => {
    await command.run(basicInteraction);
    expect(rosterServiceChangeNameSpy).toHaveBeenCalledWith(
      member,
      "forum thread id",
      "old team name",
      "new team name",
    );
    expect(editReplySpy).toHaveBeenCalledWith(
      `Team name changed. __old team name__ is now called __new team name__`,
    );
  });

  describe("errors", () => {
    it("should not change team name because the signup service had an error", async () => {
      rosterServiceChangeNameSpy.mockImplementationOnce(async () => {
        throw Error("DB Failure");
      });
      editReplySpy = jest.spyOn(basicInteraction, "editReply");
      await command.run(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Team name not changed. Error: DB Failure",
      );
    });

    it("should not change team name because member is null", async () => {
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
        "Team name not changed. Member using the command not found",
      );
    });
  });
});
