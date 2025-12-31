import {
  GuildMember,
  InteractionEditReplyOptions,
  Message,
  MessagePayload,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { CustomInteraction } from "../../../../src/commands/interaction";
import { CurrentPositionCommand } from "../../../../src/commands/scrims/signup/current-position";
import { ScrimSignupMock } from "../../../mocks/signups.mock";
import { StaticValueService } from "../../../../src/services/static-values";
import { StaticValueServiceMock } from "../../../mocks/static-values.mock";
import { ScrimSignups } from "../../../../src/services/signups";
import { ScrimSignup } from "../../../../src/models/Scrims";
import { GetSignupsHelper } from "../../../../src/commands/utility/get-signups";
import { Player } from "../../../../src/models/Player";

describe("Get current position", () => {
  let basicInteraction: CustomInteraction;
  let member: GuildMember;
  let editReplySpy: SpyInstance<
    Promise<Message<boolean>>,
    [options: string | InteractionEditReplyOptions | MessagePayload],
    string
  >;
  let getSignupsSpy: SpyInstance<
    Promise<{ mainList: ScrimSignup[]; waitList: ScrimSignup[] } | undefined>,
    [
      signupsService: ScrimSignups,
      staticValueService: StaticValueService,
      interaction: CustomInteraction,
    ],
    string
  >;

  let command: CurrentPositionCommand;

  const mockSignpuService = new ScrimSignupMock();
  const mockStaticValueService = new StaticValueServiceMock();

  beforeAll(() => {
    member = {
      id: "theheuman-id",
    } as GuildMember;
    basicInteraction = {
      member,
      channelId: "forum thread id",
      invisibleReply: jest.fn(),
      editReply: jest.fn(),
      options: {
        getString: () => "team name",
      },
    } as unknown as CustomInteraction;
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    getSignupsSpy = jest.spyOn(GetSignupsHelper, "getSignupsForChannel");
  });

  beforeEach(() => {
    editReplySpy.mockClear();
    getSignupsSpy.mockClear();
    command = new CurrentPositionCommand(
      mockSignpuService as unknown as ScrimSignups,
      mockStaticValueService as StaticValueService,
    );
  });

  it("Should get position in queue", async () => {
    const teamWithNegativePrio: ScrimSignup = {
      players: [],
      signupPlayer: {
        discordId: "",
      } as Player,
      prio: { amount: -1, reasons: "Player1: Broke rules;" },
    } as unknown as ScrimSignup;
    const teamWithPositivePrio: ScrimSignup = {
      players: [],
      signupPlayer: {
        discordId: "",
      } as Player,
      prio: { amount: 1, reasons: "Player1: Broke rules;" },
    } as unknown as ScrimSignup;
    const teamWithPlayer: ScrimSignup = {
      teamName: "as player",
      signupPlayer: {
        discordId: "",
      } as Player,
      players: [
        { discordId: "theheuman-id", displayName: "TheHeuman" } as Player,
      ],
    } as unknown as ScrimSignup;
    const teamWithPlayerAsSignupPlayer: ScrimSignup = {
      teamName: "as coach",
      players: [],
      signupPlayer: {
        discordId: "theheuman-id",
        displayName: "TheHeuman",
      } as Player,
      prio: { amount: 1, reasons: "TheHeuman: Scrim pass" },
    } as unknown as ScrimSignup;

    getSignupsSpy.mockReturnValueOnce(
      Promise.resolve({
        mainList: [
          teamWithPositivePrio,
          teamWithPlayerAsSignupPlayer,
          teamWithPlayer,
        ],
        waitList: [teamWithNegativePrio],
      }),
    );
    await command.run(basicInteraction);
    expect(editReplySpy).toHaveBeenCalledWith(
      `__as coach__ at position: 2. Prio: 1. TheHeuman: Scrim pass\n` +
        `__as player__ at position: 3. Prio: 0. \n` +
        `There is 1 team in this scrim with positive prio\n` +
        `There is 1 team in this scrim with negative prio`,
    );
  });

  it("Should get position in with no teams on positive or negative prio", async () => {
    const teamWithPlayer: ScrimSignup = {
      teamName: "as player",
      signupPlayer: {
        discordId: "",
      } as Player,
      players: [
        { discordId: "theheuman-id", displayName: "TheHeuman" } as Player,
      ],
    } as unknown as ScrimSignup;

    getSignupsSpy.mockReturnValueOnce(
      Promise.resolve({ mainList: [teamWithPlayer], waitList: [] }),
    );
    await command.run(basicInteraction);
    expect(editReplySpy).toHaveBeenCalledWith(
      `__as player__ at position: 1. Prio: 0. \n` +
        `There are 0 teams in this scrim with positive prio\n` +
        `There are 0 teams in this scrim with negative prio`,
    );
  });

  describe("errors", () => {
    it("Should not get position in queue because there was an error getting channel signups", async () => {
      getSignupsSpy.mockReturnValueOnce(Promise.resolve(undefined));
      await command.run(basicInteraction);
      expect(editReplySpy).not.toHaveBeenCalledWith(
        `Member not found on any team in this scrim`,
      );
      expect(editReplySpy).not.toHaveBeenCalledWith(
        `There are 0 teams with positive prio\n` +
          `There is 0 teams with negative prio`,
      );
    });

    it("Should not get position in queue because member not on any team", async () => {
      const teamWithPositivePrio: ScrimSignup = {
        players: [],
        signupPlayer: {
          discordId: "",
        } as Player,
      } as unknown as ScrimSignup;
      getSignupsSpy.mockReturnValueOnce(
        Promise.resolve({ mainList: [teamWithPositivePrio], waitList: [] }),
      );
      await command.run(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        `Member not found on any team in this scrim`,
      );
    });
  });
});
