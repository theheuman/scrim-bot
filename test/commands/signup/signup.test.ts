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
import { ScrimSignupMock } from "../../mocks/signups.mock";
import { ScrimSignups } from "../../../src/services/signups";
import { SignupCommand } from "../../../src/commands/signup/sign-up";
import { ScrimSignup } from "../../../src/models/Scrims";

describe("Sign up", () => {
  let basicInteraction: CustomInteraction;
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
  let signupAddTeamSpy: SpyInstance<
    Promise<ScrimSignup>,
    [channelId: string, teamName: string, signupPlayer: User, players: User[]],
    string
  >;

  let command: SignupCommand;

  const signupMember = {
    displayName: "Signup User",
    id: "signupPlayerId",
    roles: {},
  } as GuildMember;

  const mockScrimSignups = new ScrimSignupMock();

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
    basicInteraction = {
      channelId: "forum thread id",
      reply: jest.fn(),
      invisibleReply: jest.fn(),
      editReply: jest.fn(),
      followUp: jest.fn(),
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
      member: signupMember,
    } as unknown as CustomInteraction;
    replySpy = jest.spyOn(basicInteraction, "reply");
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    followUpSpy = jest.spyOn(basicInteraction, "followUp");
    signupAddTeamSpy = jest.spyOn(mockScrimSignups, "addTeam");
  });

  beforeEach(() => {
    replySpy.mockClear();
    editReplySpy.mockClear();
    followUpSpy.mockClear();
    signupAddTeamSpy.mockClear();
    command = new SignupCommand(mockScrimSignups as unknown as ScrimSignups);
  });

  it("Should complete signup but include warnings", async () => {
    await command.run(basicInteraction);
    expect(signupAddTeamSpy).toHaveBeenCalledWith(
      "forum thread id",
      "team name",
      signupMember,
      signupPlayers,
    );
    expect(followUpSpy).toHaveBeenCalledWith(
      `team name\n<@player1id>, <@player2id>, <@player3id>\nSigned up by <@signupPlayerId>.\nscrim signup db id`,
    );
    expect(followUpSpy).toHaveBeenCalledWith({
      content:
        "Your admin role overrode missing overstats.\nPlayer 1 is missing overstat id.\nPlayer 2 is missing overstat id.\nPlayer 3 is missing overstat id.",
      ephemeral: true,
    });
  });

  it("Should complete signup without warnings", async () => {
    signupAddTeamSpy.mockReturnValueOnce(
      Promise.resolve({
        signupId: "scrim signup db id",
        players: [
          {
            discordId: player1.id,
            id: "player db id 1",
            displayName: player1.displayName,
            overstatId: "1",
          },
          {
            discordId: player2.id,
            id: "player db id 2",
            displayName: player2.displayName,
            overstatId: "2",
          },
          {
            discordId: player3.id,
            id: "player db id 3",
            displayName: player3.displayName,
            overstatId: "3",
          },
        ],
        signupPlayer: {
          discordId: player1.id,
          displayName: player1.displayName,
          id: "player db id 1",
        },
        teamName: "team name",
        date: new Date(),
      }),
    );
    await command.run(basicInteraction);
    expect(signupAddTeamSpy).toHaveBeenCalledWith(
      "forum thread id",
      "team name",
      signupMember,
      signupPlayers,
    );
    expect(followUpSpy).toHaveBeenCalledWith(
      `team name\n<@player1id>, <@player2id>, <@player3id>\nSigned up by <@signupPlayerId>.\nscrim signup db id`,
    );
    expect(followUpSpy).not.toHaveBeenCalledWith(
      "Your admin role overrode missing overstats",
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

    it("should not create scrim because the command member does not exist", async () => {
      const errorInteraction = {
        reply: jest.fn(),
        options: {
          getUser: jest.fn(),
          getString: jest.fn(),
        },
        member: undefined,
      } as unknown as CustomInteraction;
      replySpy = jest.spyOn(errorInteraction, "reply");
      await command.run(errorInteraction);
      expect(replySpy).toHaveBeenCalledWith(
        "Team not signed up. Signup initiated by member that cannot be found. Contact admin",
      );
    });
  });
});
