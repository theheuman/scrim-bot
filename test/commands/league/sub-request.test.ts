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
import { LeagueSubRequestCommand } from "../../../src/commands/league/sub-request";
import { OverstatServiceMock } from "../../mocks/overstat.mock";
import {
  getPlayerOverstatUrl,
  OverstatService,
} from "../../../src/services/overstat";
import { LeagueService } from "../../../src/services/league";
import { LeagueServiceMock } from "../../mocks/league.mock";
import { DB } from "../../../src/db/db";

describe("Sub request", () => {
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
  let subRequestSpy: SpyInstance;
  let getPlayerOverstatSpy: SpyInstance<Promise<string>, [user: User], string>;

  let command: LeagueSubRequestCommand;
  let mockLeagueService: LeagueService;

  const signupMember = {
    displayName: "Signup User",
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
    const staticCommandUsedJustForInputNames = new LeagueSubRequestCommand(
      mockOverstatService,
      mockLeagueService,
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
          } else if (
            key === staticCommandUsedJustForInputNames.inputNames.weekNumber
          ) {
            return 0;
          } else {
            return null;
          }
        },
      },
      member: signupMember,
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
    subRequestSpy = jest.spyOn(mockLeagueService, "subRequest");
  });

  beforeEach(() => {
    followUpSpy.mockClear();
    subRequestSpy.mockClear();
    invisibleReplySpy.mockClear();
    command = new LeagueSubRequestCommand(
      mockOverstatService,
      mockLeagueService,
    );
  });

  it("Should make the sub request", async () => {
    await command.run(basicInteraction);
    expect(subRequestSpy).toHaveBeenCalledWith(
      "Division4",
      "Dude Cube",
      "PlacementDay1",
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
      signupMember,
      "None",
    );
    expect(followUpSpy).toHaveBeenCalledWith(
      `Sub requested for __Dude Cube__\nSubbing out <@player1id>\nSubbing in <@player2id>\nRequested week: PlacementDay1\nSheet row #0`,
    );
  });

  it("Should complete signup but warn that response can't be parsed", async () => {
    subRequestSpy.mockResolvedValueOnce(null);
    await command.run(basicInteraction);
    expect(followUpSpy).toHaveBeenCalledWith(
      `Problem parsing google sheets response, please check sheet to see if your sub request went through before resubmitting`,
    );
  });

  describe("errors", () => {
    it("should not complete the signup because google did a bad", async () => {
      subRequestSpy.mockRejectedValueOnce(new Error("Sheets Failure"));
      await command.run(basicInteraction);
      expect(followUpSpy).toHaveBeenCalledWith(
        "Sub request not made. Error: Sheets Failure",
      );
    });

    it("should not complete the signup because the overstat is not valid", async () => {
      jest
        .spyOn(mockOverstatService, "validateLinkUrl")
        .mockImplementationOnce(() => {
          throw Error("Not a link to a player overview.");
        });
      await command.run(basicInteraction);
      expect(invisibleReplySpy).toHaveBeenCalledWith(
        `Sub request not valid. Overstat link provided for player subbing in is not valid.\nError: Not a link to a player overview.`,
      );
    });

    it("should not complete the signup because the player being subbed out doesn't have an overstat", async () => {
      getPlayerOverstatSpy.mockImplementationOnce(() => {
        throw Error("Rejected get player overstat promise");
      });
      await command.run(basicInteraction);
      expect(invisibleReplySpy).toHaveBeenCalledWith(
        `Could not find overstat of the player being subbed out in the db. Please have them link it with the /link-overstat command.\nThis may have happened if you had an admin edit your signup players in a ticket.\nError: Rejected get player overstat promise`,
      );
    });
  });

  const overstats = {
    player1: getPlayerOverstatUrl("1"),
    player2: getPlayerOverstatUrl("2"),
  };
});
