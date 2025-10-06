import {
  BaseFetchOptions,
  Guild,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  InteractionResponse,
  Message,
  MessagePayload,
  Role,
  Snowflake,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { CustomInteraction } from "../../../../../src/commands/interaction";
import { AuthMock } from "../../../../mocks/auth.mock";
import { AuthService } from "../../../../../src/services/auth";
import { ScrimSignupMock } from "../../../../mocks/signups.mock";
import { ScrimSignups } from "../../../../../src/services/signups";
import { GetSignupsCommand } from "../../../../../src/commands/scrims/admin/scrim-crud/get-signups";
import { ScrimSignup } from "../../../../../src/models/Scrims";
import { StaticValueServiceMock } from "../../../../mocks/static-values.mock";
import { StaticValueService } from "../../../../../src/services/static-values";

describe("Get signups", () => {
  let basicInteraction: CustomInteraction;
  let replySpy: SpyInstance<
    Promise<InteractionResponse<boolean>>,
    [reply: string],
    string
  >;
  let followupSpy: SpyInstance<
    Promise<Message<boolean>>,
    [options: string | InteractionReplyOptions | MessagePayload],
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
  let getMembersWithScrimPassRoleSpy: SpyInstance<
    Promise<Role | null>,
    [id: Snowflake, options?: BaseFetchOptions],
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
  const mockStaticValueService = new StaticValueServiceMock();

  beforeAll(() => {
    basicInteraction = {
      channelId: "forum thread id",
      invisibleReply: jest.fn(),
      editReply: jest.fn(),
      followUp: jest.fn(),
      guild: {
        roles: {
          fetch: () => jest.fn(),
        },
      },
    } as unknown as CustomInteraction;
    replySpy = jest.spyOn(basicInteraction, "invisibleReply");
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    followupSpy = jest.spyOn(basicInteraction, "followUp");
    getSignupsSpy = jest.spyOn(mockScrimSignups, "getSignups");
    getSignupsSpy.mockImplementation(() => {
      return Promise.resolve({
        mainList: mainListTeams,
        waitList: waitListTeams,
      });
    });
    const guild: Guild = basicInteraction.guild as Guild;
    // @ts-expect-error its trying to match the incorrect method
    getMembersWithScrimPassRoleSpy = jest.spyOn(guild.roles, "fetch");
    getMembersWithScrimPassRoleSpy.mockReturnValue(
      Promise.resolve({ members: [] } as unknown as Role),
    );
  });

  beforeEach(() => {
    replySpy.mockClear();
    followupSpy.mockClear();
    editReplySpy.mockClear();
    getSignupsSpy.mockClear();
    getMembersWithScrimPassRoleSpy.mockClear();
    command = new GetSignupsCommand(
      new AuthMock() as AuthService,
      mockScrimSignups as unknown as ScrimSignups,
      mockStaticValueService as unknown as StaticValueService,
    );
  });

  it("Should get signups", async () => {
    jest.useFakeTimers();
    getMembersWithScrimPassRoleSpy.mockReturnValueOnce(
      Promise.resolve({
        members: [["an id", { id: "an id" }]],
      } as unknown as Role),
    );
    await command.run(basicInteraction);
    expect(getMembersWithScrimPassRoleSpy).toHaveBeenCalledWith("3568173514", {
      cache: true,
      force: true,
    });
    expect(getSignupsSpy).toHaveBeenCalledWith("forum thread id", ["an id"]);
    const expectedMainListString = `Main list.\n__Main list team__. Signed up by: <@teamCapDiscordId1>. Players: <@teamCapDiscordId1> <@teamCapDiscordId1>. Prio: 1. League prio.\n__Main list team 2__. Signed up by: <@teamCapDiscordId2>. Players: .\n`;
    const expectedWaitListString = `Wait list.\n__Wait list team__. Signed up by: <@teamCapDiscordId3>. Players: . Prio: -1. Team captain is a known inter.\n`;
    expect(followupSpy).toHaveBeenCalledWith({
      content: expectedMainListString,
      ephemeral: true,
    });
    expect(followupSpy).toHaveBeenCalledWith({
      content: expectedWaitListString,
      ephemeral: true,
    });
    jest.runAllTimers();
    jest.useRealTimers();
  });

  it("should get signups but reply with error because theres no scrim pass role id in the db", async () => {
    if (!basicInteraction.guild) {
      expect(true).toBeFalsy();
      return;
    }
    getMembersWithScrimPassRoleSpy.mockReturnValueOnce(Promise.resolve(null));
    jest
      .spyOn(mockStaticValueService, "getScrimPassRoleId")
      .mockReturnValueOnce(Promise.resolve(undefined));

    await command.run(basicInteraction);
    expect(editReplySpy).toHaveBeenCalledWith(
      "Unable to get scrim pass role id from db",
    );
    expect(getSignupsSpy).toHaveBeenCalledWith("forum thread id", []);
  });

  it("should get signups but reply with error because the guild is not defined", async () => {
    if (!basicInteraction.guild) {
      expect(true).toBeFalsy();
      return;
    }
    getMembersWithScrimPassRoleSpy.mockReturnValueOnce(Promise.resolve(null));

    await command.run(basicInteraction);
    expect(editReplySpy).toHaveBeenCalledWith(
      "Can't fetch scrim pass role members from discord",
    );
    expect(getSignupsSpy).toHaveBeenCalledWith("forum thread id", []);
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
