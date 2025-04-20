import {
  GuildMember,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  InteractionResponse,
  Message,
  MessagePayload,
  User,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { CustomInteraction } from "../../../src/commands/interaction";
import { SubPlayerCommand } from "../../../src/commands/signup/sub-player";
import { RosterServiceMock } from "../../mocks/roster.mock";
import { RosterService } from "../../../src/services/rosters";
import { ScrimSignup } from "../../../src/models/Scrims";
import { Player } from "../../../src/models/Player";

describe("Sub player", () => {
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
  let replaceTeammateSpy: SpyInstance<
    Promise<ScrimSignup>,
    [
      member: GuildMember,
      channelId: string,
      teamName: string,
      oldPlayer: User,
      newPlayer: User,
    ],
    string
  >;

  let command: SubPlayerCommand;

  const mockRosterService = new RosterServiceMock();

  const player1 = {
    displayName: "Player 1",
    id: "player1id",
  } as User;

  const player2 = {
    displayName: "Player 2",
    id: "player2id",
  } as User;

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
        getUser: (key: string) => {
          if (key === "add-player") {
            return player2;
          } else if (key === "remove-player") {
            return player1;
          }
        },
        getString: () => "team name",
      },
    } as unknown as CustomInteraction;
    replySpy = jest.spyOn(basicInteraction, "reply");
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    replaceTeammateSpy = jest.spyOn(mockRosterService, "replaceTeammate");
    replaceTeammateSpy.mockReturnValue(
      Promise.resolve({
        teamName: "team name",
        players: [
          { discordId: "unchangedPlayer1" },
          { discordId: "unchangedPlayer2" },
          { discordId: "player2id" },
        ] as Player[],
        signupPlayer: player1 as unknown as Player,
        signupId: "",
        date: new Date(),
      }),
    );
  });

  beforeEach(() => {
    replySpy.mockClear();
    editReplySpy.mockClear();
    replaceTeammateSpy.mockClear();
    command = new SubPlayerCommand(
      mockRosterService as unknown as RosterService,
    );
  });

  it("Should replace player", async () => {
    await command.run(basicInteraction);
    expect(replaceTeammateSpy).toHaveBeenCalledWith(
      member,
      "forum thread id",
      "team name",
      player1,
      player2,
    );
    expect(editReplySpy).toHaveBeenCalledWith(
      `Sub made. <@player1id> replaced by <@player2id>.\n` +
        `Roster: <@unchangedPlayer1>, <@unchangedPlayer2>, <@player2id>`,
    );
  });

  describe("errors", () => {
    it("should not sub player because the signup service had an error", async () => {
      replaceTeammateSpy.mockImplementationOnce(async () => {
        throw Error("DB Failure");
      });
      editReplySpy = jest.spyOn(basicInteraction, "editReply");
      await command.run(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Sub not made. Error: DB Failure",
      );
    });

    it("should not sub player because member is null", async () => {
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
        "Sub not made. Member using the command not found",
      );
    });
  });
});
