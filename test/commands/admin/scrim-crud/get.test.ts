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
import { CloseScrimCommand } from "../../../../src/commands/admin/scrim-crud/close-scrim";
import { GetSignupsCommand } from "../../../../src/commands/admin/scrim-crud/get-signups";
import { ScrimSignup } from "../../../../src/models/Scrims";

describe("Get signups", () => {
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
  let getSignupsSpy: SpyInstance<
    Promise<{ mainList: ScrimSignup[]; waitList: ScrimSignup[] }>,
    [channelId: string],
    string
  >;

  const fakeDate = new Date();

  const teamCaptain1 = {
    id: "teamCap1",
    discordId: "teamCapDiscordId1",
    displayName: "Team Captain 1",
  };

  const mainListTeams: ScrimSignup[] = [
    {
      teamName: "Main list team",
      players: [teamCaptain1, teamCaptain1],
      signupId: "",
      signupPlayer: teamCaptain1,
      date: fakeDate,
      prio: {
        amount: 1,
        reasons: "League prio",
      },
    },
    {
      teamName: "Main list team 2",
      players: [],
      signupId: "",
      signupPlayer: {
        id: "teamCap2",
        discordId: "teamCapDiscordId2",
        displayName: "Team Captain 2",
      },
      date: fakeDate,
    },
  ];

  const waitListTeams: ScrimSignup[] = [
    {
      teamName: "Wait list team",
      players: [],
      signupId: "",
      signupPlayer: {
        id: "teamCap3",
        discordId: "teamCapDiscordId3",
        displayName: "Team Captain 3",
      },
      date: fakeDate,
      prio: {
        amount: -1,
        reasons: "Team captain is a known inter",
      },
    },
  ];

  let command: GetSignupsCommand;

  const mockScrimSignups = new ScrimSignupMock();

  beforeAll(() => {
    basicInteraction = {
      channelId: "forum thread id",
      reply: jest.fn(),
      editReply: jest.fn(),
    } as unknown as CustomInteraction;
    replySpy = jest.spyOn(basicInteraction, "reply");
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    getSignupsSpy = jest.spyOn(mockScrimSignups, "getSignups");
    getSignupsSpy.mockImplementation(() => {
      return Promise.resolve({
        mainList: mainListTeams,
        waitList: waitListTeams,
      });
    });
  });

  beforeEach(() => {
    replySpy.mockClear();
    editReplySpy.mockClear();
    getSignupsSpy.mockClear();
    command = new GetSignupsCommand(
      new AuthMock() as AuthService,
      mockScrimSignups as unknown as ScrimSignups,
    );
  });

  it("Should get signups", async () => {
    jest.useFakeTimers();
    await command.run(basicInteraction);
    expect(getSignupsSpy).toHaveBeenCalledWith("forum thread id");
    const expectedString = `Main list.\n__Main list team__. Signed up by: <@teamCapDiscordId1>. Players: <@teamCapDiscordId1> <@teamCapDiscordId1>. Prio: 1. League prio.\n__Main list team 2__. Signed up by: <@teamCapDiscordId2>. Players: .\n\n\nWait list.\n__Wait list team__. Signed up by: <@teamCapDiscordId3>. Players: . Prio: -1. Team captain is a known inter.`;
    expect(editReplySpy).toHaveBeenCalledWith(expectedString);
    jest.runAllTimers();
    jest.useRealTimers();
  });

  describe("errors", () => {
    it("should not get signups because the signup service threw an exception", async () => {
      getSignupsSpy.mockImplementation(() => {
        throw Error("No scrim found for that channel");
      });

      await command.run(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Could not fetch signups. Error: No scrim found for that channel",
      );
    });
  });
});
