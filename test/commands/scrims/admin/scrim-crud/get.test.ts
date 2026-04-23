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
import { GetSignupsCommand } from "../../../../../src/commands/scrims/admin/scrim-crud/get-signups";
import { ScrimSignup } from "../../../../../src/models/Scrims";
import { StaticValueServiceMock } from "../../../../mocks/static-values.mock";
import { StaticValueService } from "../../../../../src/services/static-values";
import { SignupServiceMock } from "../../../../mocks/signups.mock";
import { SignupService } from "../../../../../src/services/signups";
import { MmrServiceMock } from "../../../../mocks/mmr.mock";
import { MmrService } from "../../../../../src/services/mmr";
import * as fs from "node:fs";

jest.mock("node:fs", () => ({
  writeFileSync: jest.fn(),
  unlink: jest.fn(),
}));

jest.mock("../../../../../src/config", () => {
  return {
    appConfig: {
      lobbySize: 20,
    },
  };
});

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
  let getMmrMapSpy: SpyInstance<
    Promise<Map<string, number>>,
    [forceRefresh?: boolean]
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

  const mockSignupService = new SignupServiceMock();
  const mockStaticValueService = new StaticValueServiceMock();
  const mockMmrService = new MmrServiceMock();

  function generateTeams(count: number): ScrimSignup[] {
    return Array.from({ length: count }, (_, i) => ({
      teamName: `Team ${i}`,
      players: [
        {
          id: `p${i}a`,
          discordId: `discord${i}a`,
          displayName: `Player ${i}A`,
          overstatId: `overstat${i}a`,
        },
        {
          id: `p${i}b`,
          discordId: `discord${i}b`,
          displayName: `Player ${i}B`,
          overstatId: `overstat${i}b`,
        },
        {
          id: `p${i}c`,
          discordId: `discord${i}c`,
          displayName: `Player ${i}C`,
          overstatId: `overstat${i}c`,
        },
      ],
      signupId: `signup${i}`,
      signupPlayer: {
        id: `cap${i}`,
        discordId: `capDiscord${i}`,
        displayName: `Cap ${i}`,
      },
      date: fakeDate,
    }));
  }

  beforeAll(() => {
    basicInteraction = {
      channelId: "forum thread id",
      invisibleReply: jest.fn(),
      editReply: jest.fn(),
      followUp: jest.fn(),
      options: {
        getBoolean: jest.fn().mockReturnValue(null),
      },
      guild: {
        roles: {
          fetch: () => jest.fn(),
        },
      },
    } as unknown as CustomInteraction;
    replySpy = jest.spyOn(basicInteraction, "invisibleReply");
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    followupSpy = jest.spyOn(basicInteraction, "followUp");
    getSignupsSpy = jest.spyOn(mockSignupService, "getSignups");
    const guild: Guild = basicInteraction.guild as Guild;
    // @ts-expect-error its trying to match the incorrect method
    getMembersWithScrimPassRoleSpy = jest.spyOn(guild.roles, "fetch");
    getMembersWithScrimPassRoleSpy.mockReturnValue(
      Promise.resolve({ members: [] } as unknown as Role),
    );
    getMmrMapSpy = jest.spyOn(mockMmrService, "getMmrMap");
  });

  beforeEach(() => {
    replySpy.mockClear();
    followupSpy.mockClear();
    editReplySpy.mockClear();
    getMembersWithScrimPassRoleSpy.mockClear();
    getMmrMapSpy.mockClear();
    (fs.writeFileSync as jest.Mock).mockClear();
    getSignupsSpy.mockClear();
    getSignupsSpy.mockImplementation(() => {
      return Promise.resolve({
        mainList: mainListTeams,
        waitList: waitListTeams,
      });
    });
    command = new GetSignupsCommand(
      new AuthMock() as AuthService,
      mockSignupService as unknown as SignupService,
      mockStaticValueService as unknown as StaticValueService,
      mockMmrService as unknown as MmrService,
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
    const expectedMainListString = `Main list.\n__Main list team__\nSigned up by: <@teamCapDiscordId1>.\nPlayers: <@teamCapDiscordId1>, <@teamCapDiscordId1>. Prio: 1. League prio.\n__Main list team 2__\nSigned up by: <@teamCapDiscordId2>.\nPlayers: .\n`;
    const expectedWaitListString = `Wait list.\n__Wait list team__\nSigned up by: <@teamCapDiscordId3>.\nPlayers: . Prio: -1. Team captain is a known inter.\n`;
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

  describe("MMR sorting", () => {
    it("should call mmr service with forceRefresh=false by default", async () => {
      await command.run(basicInteraction);
      expect(getMmrMapSpy).toHaveBeenCalledWith(false);
    });

    it("should call mmr service with forceRefresh=true when refresh-mmr option is set", async () => {
      (basicInteraction.options.getBoolean as jest.Mock).mockReturnValueOnce(
        true,
      );
      await command.run(basicInteraction);
      expect(getMmrMapSpy).toHaveBeenCalledWith(true);
    });

    it("should still generate priority csv and warn when mmr fetch fails", async () => {
      getMmrMapSpy.mockRejectedValueOnce(new Error("API down"));
      await command.run(basicInteraction);
      expect(followupSpy).toHaveBeenCalledWith({
        content: expect.stringContaining("Could not fetch MMR data"),
        ephemeral: true,
      });
      expect(followupSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          files: expect.arrayContaining([
            expect.objectContaining({ name: "signups.csv" }),
          ]),
        }),
      );
    });

    it("should not include mmr csv when main list has fewer than 40 teams", async () => {
      getSignupsSpy.mockReturnValueOnce(
        Promise.resolve({ mainList: generateTeams(20), waitList: [] }),
      );
      await command.run(basicInteraction);
      expect(followupSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({
          files: expect.arrayContaining([
            expect.objectContaining({ name: "signups-mmr.csv" }),
          ]),
        }),
      );
    });

    it("should include mmr csv in reply when main list has 40 or more teams", async () => {
      getSignupsSpy.mockReturnValueOnce(
        Promise.resolve({ mainList: generateTeams(40), waitList: [] }),
      );
      await command.run(basicInteraction);
      expect(followupSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          files: expect.arrayContaining([
            expect.objectContaining({ name: "signups.csv" }),
            expect.objectContaining({ name: "signups-mmr.csv" }),
          ]),
        }),
      );
    });

    it("should use a separator with column count matching data rows in the priority csv", async () => {
      await command.run(basicInteraction);
      const writeFileSyncMock = fs.writeFileSync as jest.Mock;
      const priorityCsvCall = writeFileSyncMock.mock.calls.find(
        (call) => !(call[0] as string).includes("mmr"),
      );
      expect(priorityCsvCall).toBeDefined();
      const csvContent = priorityCsvCall![1] as string;
      const rows = csvContent.split("\n");
      const dataRow = rows[0];
      const separatorRow = rows.find((row) => /^,+$/.test(row));
      expect(separatorRow).toBeDefined();
      expect(separatorRow!.split(",").length).toBe(dataRow.split(",").length);
    });

    it("should place unknown mmr main list teams into higher skill lobbies but not include waitlist unknown teams", async () => {
      // team 0 has known MMR, all other generated teams are UNKNOWN (not in map)
      const mmrMap = new Map([
        ["overstat0a", 0.5],
        ["overstat0b", 0.5],
        ["overstat0c", 0.5],
      ]);
      getMmrMapSpy.mockResolvedValueOnce(mmrMap);
      const waitlistTeam: ScrimSignup = {
        teamName: "Waitlist Unknown Team",
        players: [
          { id: "wp1", discordId: "wd1", displayName: "WP1" },
          { id: "wp2", discordId: "wd2", displayName: "WP2" },
          { id: "wp3", discordId: "wd3", displayName: "WP3" },
        ],
        signupId: "ws1",
        signupPlayer: {
          id: "wcap",
          discordId: "wcapdiscord",
          displayName: "WCap",
        },
        date: fakeDate,
      };
      getSignupsSpy.mockReturnValueOnce(
        Promise.resolve({
          mainList: generateTeams(40),
          waitList: [waitlistTeam],
        }),
      );
      await command.run(basicInteraction);
      const writeFileSyncMock = fs.writeFileSync as jest.Mock;
      const mmrCsvCall = writeFileSyncMock.mock.calls.find((call) =>
        (call[0] as string).includes("mmr"),
      );
      expect(mmrCsvCall).toBeDefined();
      const csvContent = mmrCsvCall![1] as string;
      // waitlist team must not appear in the MMR CSV regardless of its MMR status
      expect(csvContent).not.toContain("Waitlist Unknown Team");
      const csvRows = csvContent.split("\n");
      // unknown main list teams float to the top of lobby 1
      // row 0 is header, row 1 is "--- Lobby 1 ---", row 2 is first team row
      expect(csvRows[2]).toMatch(/^UNKNOWN,/);
      // team 0 (the only team with known MMR) sinks to the last position
      const lastTeamRow = csvRows.at(-1)!;
      expect(lastTeamRow).toContain(",Team 0,");
      expect(lastTeamRow).toMatch(/^,/);
    });

    it("should write player mmr values into the mmr csv", async () => {
      const knownMmrMap = new Map([
        ["overstat0a", 0.9],
        ["overstat0b", 0.8],
        ["overstat0c", 0.7],
      ]);
      getMmrMapSpy.mockResolvedValueOnce(knownMmrMap);
      getSignupsSpy.mockReturnValueOnce(
        Promise.resolve({ mainList: generateTeams(40), waitList: [] }),
      );
      await command.run(basicInteraction);
      const writeFileSyncMock = fs.writeFileSync as jest.Mock;
      const mmrCsvCall = writeFileSyncMock.mock.calls.find((call) =>
        (call[0] as string).includes("mmr"),
      );
      expect(mmrCsvCall).toBeDefined();
      const csvContent = mmrCsvCall![1] as string;
      expect(csvContent).toContain("0.900");
      expect(csvContent).toContain("0.800");
      expect(csvContent).toContain("0.700");
    });
  });
});
