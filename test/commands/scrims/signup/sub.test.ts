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
import { CustomInteraction } from "../../../../src/commands/interaction";
import { SubPlayerCommand } from "../../../../src/commands/scrims/signup/sub-player";
import { RosterService } from "../../../../src/services/rosters";
import { AlertService } from "../../../../src/services/alert";
import { StaticValueService } from "../../../../src/services/static-values";
import { provideMagickalMock } from "../../../mocks/magickal-mock";
import { ScrimSignup } from "../../../../src/models/Scrims";
import { Player } from "../../../../src/models/Player";

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
  let followUpSpy: SpyInstance<
    Promise<Message<boolean>>,
    [reply: string | InteractionReplyOptions | MessagePayload],
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

  const mockRosterService = provideMagickalMock(RosterService);
  const mockStaticValueService = provideMagickalMock(StaticValueService);

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
      followUp: jest.fn(),
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
    followUpSpy = jest.spyOn(basicInteraction, "followUp");
    replaceTeammateSpy = jest.spyOn(mockRosterService, "replaceTeammate");
    replaceTeammateSpy.mockReturnValue(
      Promise.resolve({
        teamName: "team name",
        players: [
          { discordId: "unchangedPlayer1", overstatId: "os1" },
          { discordId: "unchangedPlayer2", overstatId: "os2" },
          { discordId: "player2id", overstatId: "os3" },
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
    followUpSpy.mockClear();
    replaceTeammateSpy.mockClear();
    jest
      .spyOn(mockStaticValueService, "requireOverstatForSignup")
      .mockResolvedValue(true);
    command = new SubPlayerCommand(
      provideMagickalMock(AlertService),
      mockRosterService,
      mockStaticValueService,
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
        `__team name__ new roster: <@unchangedPlayer1>, <@unchangedPlayer2>, <@player2id>`,
    );
    expect(followUpSpy).not.toHaveBeenCalled();
  });

  it("Should warn with admin override message when new player has no overstat and overstat is required", async () => {
    replaceTeammateSpy.mockReturnValueOnce(
      Promise.resolve({
        teamName: "team name",
        players: [
          { discordId: "unchangedPlayer1", overstatId: "os1" },
          { discordId: "unchangedPlayer2", overstatId: "os2" },
          { discordId: "player2id", displayName: "Player 2" },
        ] as Player[],
        signupPlayer: player1 as unknown as Player,
        signupId: "",
        date: new Date(),
      }),
    );
    await command.run(basicInteraction);
    expect(followUpSpy).toHaveBeenCalledWith({
      content: "Your admin role overrode missing overstats for: Player 2",
      ephemeral: true,
    });
  });

  it("Should warn with encouragement message when new player has no overstat and overstat is not required", async () => {
    jest
      .spyOn(mockStaticValueService, "requireOverstatForSignup")
      .mockResolvedValueOnce(false);
    replaceTeammateSpy.mockReturnValueOnce(
      Promise.resolve({
        teamName: "team name",
        players: [
          { discordId: "unchangedPlayer1", overstatId: "os1" },
          { discordId: "unchangedPlayer2", overstatId: "os2" },
          { discordId: "player2id", displayName: "Player 2" },
        ] as Player[],
        signupPlayer: player1 as unknown as Player,
        signupId: "",
        date: new Date(),
      }),
    );
    await command.run(basicInteraction);
    expect(followUpSpy).toHaveBeenCalledWith({
      content:
        "The following players have not linked their Overstat: Player 2. To accurately sort your team in the future, please let them know to link their Overstat by following the pinned instructions in https://discord.com/channels/1043350338574495764/1341877592139104376",
      ephemeral: true,
    });
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
