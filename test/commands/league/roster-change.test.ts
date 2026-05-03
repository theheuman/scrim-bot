import {
  GuildMember,
  InteractionReplyOptions,
  InteractionResponse,
  Message,
  MessagePayload,
  User,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { CustomInteraction } from "../../../src/commands/interaction";
import { RosterChangeCommand } from "../../../src/commands/league/roster-change";
import { OverstatServiceMock } from "../../mocks/overstat.mock";
import {
  getPlayerOverstatUrl,
  OverstatService,
} from "../../../src/services/overstat";
import { LeagueService } from "../../../src/services/league";
import { LeagueServiceMock } from "../../mocks/league.mock";
import { DB } from "../../../src/db/db";
import { StaticValueService } from "../../../src/services/static-values";
import { StaticValueServiceMock } from "../../mocks/static-values.mock";

describe("Roster change", () => {
  let basicInteraction: CustomInteraction;
  let followUpSpy: SpyInstance<
    Promise<Message<boolean>>,
    [reply: string | InteractionReplyOptions | MessagePayload],
    string
  >;
  let invisibleReplySpy: SpyInstance<
    Promise<InteractionResponse<boolean>>,
    [message: string],
    string
  >;
  let rosterChangeSpy: SpyInstance;
  let getPlayerOverstatSpy: SpyInstance<Promise<string>, [user: User], string>;

  let command: RosterChangeCommand;
  let mockLeagueService: LeagueService;
  let mockStaticValueService: StaticValueService;
  let staticCommandUsedJustForInputNames: RosterChangeCommand;

  const requestingMember = {
    displayName: "Requesting User",
    id: "player1id",
    roles: {},
  } as GuildMember;

  const playerOut = {
    displayName: "Player 1",
    id: "player1id",
  } as User;

  const playerIn = {
    displayName: "Player 2",
    id: "player2id",
  } as User;

  let mockOverstatService: OverstatService;

  beforeAll(() => {
    mockOverstatService = new OverstatServiceMock() as OverstatService;
    mockLeagueService = new LeagueServiceMock() as unknown as LeagueService;
    mockStaticValueService =
      new StaticValueServiceMock() as unknown as StaticValueService;
    staticCommandUsedJustForInputNames = new RosterChangeCommand(
      mockOverstatService,
      mockLeagueService,
      mockStaticValueService,
    );
    basicInteraction = {
      channelId: "forum thread id",
      invisibleReply: jest.fn(),
      deferReply: jest.fn(),
      followUp: jest.fn(),
      options: {
        getUser: (key: string) => {
          if (key === "player-out") {
            return playerOut;
          } else if (key === "player-in") {
            return playerIn;
          } else {
            return null;
          }
        },
        getString: (key: string) => {
          if (key === staticCommandUsedJustForInputNames.inputNames.teamName) {
            return "Dude Cube";
          } else if (
            key ===
            staticCommandUsedJustForInputNames.inputNames.playerInInputNames
              .overstatLink
          ) {
            return overstats.player2;
          } else if (
            key ===
            staticCommandUsedJustForInputNames.inputNames.additionalComments
          ) {
            return "None";
          } else {
            return null;
          }
        },
        getChoice: (key: string) => {
          if (
            key === staticCommandUsedJustForInputNames.inputNames.teamDivision
          ) {
            return 4;
          } else {
            return null;
          }
        },
      },
      member: requestingMember,
    } as unknown as CustomInteraction;
    followUpSpy = jest.spyOn(basicInteraction, "followUp");
    invisibleReplySpy = jest.spyOn(basicInteraction, "invisibleReply");

    jest
      .spyOn(mockOverstatService, "getPlayerId")
      .mockImplementation((overstatLink) => {
        return new OverstatService(undefined as unknown as DB).getPlayerId(
          overstatLink,
        );
      });
    getPlayerOverstatSpy = jest.spyOn(mockOverstatService, "getPlayerOverstat");
    getPlayerOverstatSpy.mockImplementation((user) =>
      user.id === playerOut.id
        ? Promise.resolve(overstats.player1)
        : Promise.resolve(overstats.player2),
    );
    rosterChangeSpy = jest.spyOn(mockLeagueService, "rosterChange");
  });

  beforeEach(() => {
    followUpSpy.mockClear();
    rosterChangeSpy.mockClear();
    invisibleReplySpy.mockClear();
    getPlayerOverstatSpy.mockClear();
    command = new RosterChangeCommand(
      mockOverstatService,
      mockLeagueService,
      mockStaticValueService,
    );
  });

  it("Should make the roster change request", async () => {
    await command.run(basicInteraction);
    expect(rosterChangeSpy).toHaveBeenCalledWith(
      "Division4",
      "Dude Cube",
      {
        name: playerOut.displayName,
        discordId: playerOut.id,
        overstatLink: overstats.player1,
      },
      {
        name: playerIn.displayName,
        discordId: playerIn.id,
        overstatLink: overstats.player2,
      },
      requestingMember,
      "None",
    );
    expect(followUpSpy).toHaveBeenCalledWith(
      `Roster change requested for __Dude Cube__ (Division4)\nRemoving <@player1id> [Overstat](<${overstats.player1}>)\nAdding <@player2id> [Overstat](<${overstats.player2}>)\nSheet row #0\n<https://docs.google.com/spreadsheets/d/mock_roster_sheet_id>\nNavigate to the "mock_roster_tab_name" tab at the bottom of the sheet\n<@&sub-approval-role-id>`,
    );
  });

  it("Should complete request but warn that response can't be parsed", async () => {
    rosterChangeSpy.mockResolvedValueOnce({
      rowNumber: null,
      sheetUrl: "<https://docs.google.com/spreadsheets/d/mock_roster_sheet_id>",
      tabName: "mock_roster_tab_name",
    });
    await command.run(basicInteraction);
    expect(followUpSpy).toHaveBeenCalledWith(
      `Problem parsing google sheets response, please check sheet to see if your roster change went through before resubmitting\n<https://docs.google.com/spreadsheets/d/mock_roster_sheet_id>`,
    );
  });

  describe("player-out overstat provided directly", () => {
    let interactionWithPlayerOutOverstat: CustomInteraction;

    beforeAll(() => {
      interactionWithPlayerOutOverstat = {
        ...basicInteraction,
        options: {
          ...(basicInteraction.options as object),
          getString: (key: string) => {
            if (
              key ===
              staticCommandUsedJustForInputNames.inputNames.playerOutInputNames
                .overstatLink
            ) {
              return overstats.player1;
            }
            return (
              basicInteraction.options as unknown as {
                getString: (key: string) => string | null;
              }
            ).getString(key);
          },
        },
      } as unknown as CustomInteraction;
    });

    it("Should make the roster change with player-out overstat provided directly", async () => {
      await command.run(interactionWithPlayerOutOverstat);
      expect(rosterChangeSpy).toHaveBeenCalledWith(
        "Division4",
        "Dude Cube",
        {
          name: playerOut.displayName,
          discordId: playerOut.id,
          overstatLink: overstats.player1,
        },
        {
          name: playerIn.displayName,
          discordId: playerIn.id,
          overstatLink: overstats.player2,
        },
        requestingMember,
        "None",
      );
    });

    it("Should not complete because player-out overstat link is invalid", async () => {
      jest
        .spyOn(mockOverstatService, "validateLinkUrl")
        .mockImplementationOnce(() => {
          throw Error("Not a link to a player overview.");
        });
      await command.run(interactionWithPlayerOutOverstat);
      expect(invisibleReplySpy).toHaveBeenCalledWith(
        `Roster change not made. The overstat link provided for the player being removed is not valid.\nError: Not a link to a player overview.`,
      );
    });
  });

  describe("errors", () => {
    it("should not complete because google did a bad", async () => {
      rosterChangeSpy.mockRejectedValueOnce(new Error("Sheets Failure"));
      await command.run(basicInteraction);
      expect(followUpSpy).toHaveBeenCalledWith(
        "Roster change not made. Error: Sheets Failure",
      );
    });

    it("should not complete because the player-in overstat is not valid", async () => {
      jest
        .spyOn(mockOverstatService, "validateLinkUrl")
        .mockImplementationOnce(() => {
          throw Error("Not a link to a player overview.");
        });
      await command.run(basicInteraction);
      expect(invisibleReplySpy).toHaveBeenCalledWith(
        `Roster change not made. Overstat link provided for player being added is not valid.\nError: Not a link to a player overview.`,
      );
    });

    it("should not complete because the player being removed has no overstat in the db", async () => {
      getPlayerOverstatSpy.mockRejectedValueOnce(
        new Error("Rejected get player overstat promise"),
      );
      await command.run(basicInteraction);
      expect(invisibleReplySpy).toHaveBeenCalledWith(
        `Roster change not made. No overstat link found for player being removed from the roster. Please retry the command with the player-out-overstat-link filled in or write "None" if they do not have one.`,
      );
    });
  });

  const overstats = {
    player1: getPlayerOverstatUrl("1"),
    player2: getPlayerOverstatUrl("2"),
  };
});
