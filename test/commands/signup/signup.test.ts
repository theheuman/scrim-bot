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
import { AuthMock } from "../../mocks/auth.mock";
import { AuthService } from "../../../src/services/auth";
import { ScrimSignupMock } from "../../mocks/signups.mock";
import { ScrimSignups } from "../../../src/services/signups";
import { CloseScrimCommand } from "../../../src/commands/admin/scrim-crud/close-scrim";
import { SignupCommand } from "../../../src/commands/signup/sign-up";

describe("Sign up", () => {
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
  let signupAddTeamSpy: SpyInstance<
    Promise<string>,
    [channelId: string, teamName: string, signupPlayer: User, players: User[]],
    string
  >;

  let command: SignupCommand;

  const mockScrimSignups = new ScrimSignupMock();

  const signupUser = {
    displayName: "Signup User",
    id: "signupPlayerId",
  } as User;

  const player1 = {
    displayName: "Player 1",
    id: "player1id",
  } as User;

  const player2 = {
    displayName: "Player 2",
    id: "player2id",
  } as User;

  const player3 = {
    displayName: "Player 3",
    id: "player3id",
  } as User;

  const signupPlayers = [player1, player2, player3];

  beforeAll(() => {
    member = {
      roles: {},
      user: {
        username: "TheHeuman",
      },
    } as GuildMember;
    basicInteraction = {
      channelId: "forum thread id",
      reply: jest.fn(),
      editReply: jest.fn(),
      options: {
        getUser: (key: string) => {
          if (key === "player1") {
            return player1;
          } else if (key === "player2") {
            return player2;
          } else {
            return player3;
          }
        },
        getString: () => "team name",
      },
      user: signupUser,
    } as unknown as CustomInteraction;
    replySpy = jest.spyOn(basicInteraction, "reply");
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    signupAddTeamSpy = jest.spyOn(mockScrimSignups, "addTeam");
    signupAddTeamSpy.mockImplementation(() => {
      return Promise.resolve("db id");
    });
  });

  beforeEach(() => {
    replySpy.mockClear();
    editReplySpy.mockClear();
    signupAddTeamSpy.mockClear();
    command = new SignupCommand(mockScrimSignups as unknown as ScrimSignups);
  });

  it("Should complete signup", async () => {
    await command.run(basicInteraction);
    expect(signupAddTeamSpy).toHaveBeenCalledWith(
      "forum thread id",
      "team name",
      signupUser,
      signupPlayers,
    );
    expect(editReplySpy).toHaveBeenCalledWith(
      `Team team name signed up with players: <@player1id>, <@player2id>, <@player3id>, signed up by <@signupPlayerId>. Signup id: db id`,
    );
  });

  describe("errors", () => {
    it("should not create scrim because the signup service had an error", async () => {
      signupAddTeamSpy.mockImplementationOnce(async () => {
        throw Error("DB Failure");
      });
      editReplySpy = jest.spyOn(basicInteraction, "editReply");
      await command.run(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Team not signed up. Error: DB Failure",
      );
    });
  });
});
