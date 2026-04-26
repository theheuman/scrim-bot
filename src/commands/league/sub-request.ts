import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { isGuildMember } from "../../utility/utility";
import { OverstatService } from "../../services/overstat";
import { VesaDivision } from "../../models/league-models";
import { LeagueCommandHelper } from "./league-command-helper";
import { LeagueService } from "../../services/league";

export class LeagueSubRequestCommand extends MemberCommand {
  inputNames = {
    teamName: "team-name",
    teamDivision: "team-division",
    weekNumber: "week-number",

    playerOutInputNames: {
      user: "player-out",
    },

    playerInInputNames: {
      user: "player-in",
      overstatLink: "player-in-overstat-link",
    },
    additionalComments: "additional-comments",
  };

  constructor(
    private overstatService: OverstatService,
    private leagueService: LeagueService,
  ) {
    super("sub-request", "Request a sub");
    this.addStringInput(this.inputNames.teamName, "Team name", {
      isRequired: true,
      minLength: 1,
      maxLength: 25,
    });

    this.addChoiceInput(
      this.inputNames.teamDivision,
      `Which division or placement lobby is your team playing in`,
      VesaSubRequestDivision,
      true,
    );

    this.addChoiceInput(
      this.inputNames.weekNumber,
      `Which week `,
      WeekNumbers,
      true,
    );

    this.addUserInput(
      this.inputNames.playerOutInputNames.user,
      "@player subbing out",
      true,
    );
    this.addUserInput(
      this.inputNames.playerInInputNames.user,
      "@player subbing in",
      true,
    );

    this.addStringInput(
      this.inputNames.playerInInputNames.overstatLink,
      `Overstat link of the player subbing in. Write "None" if they do not have one`,
      {
        isRequired: true,
      },
    );

    this.addStringInput(
      this.inputNames.additionalComments,
      `Anything additional details about this sub, or comments? (how many games, subbed previously? etc.)`,
    );
  }

  async run(interaction: CustomInteraction) {
    const teamName = interaction.options.getString(
      this.inputNames.teamName,
      true,
    );
    const teamDivision = interaction.options.getChoice(
      this.inputNames.teamDivision,
      VesaDivision,
      true,
    );
    const weekNumber = interaction.options.getChoice(
      this.inputNames.weekNumber,
      WeekNumbers,
      true,
    );
    const requestedByMember = interaction.member;
    const playerOut = interaction.options.getUser(
      this.inputNames.playerOutInputNames.user,
      true,
    );
    const playerIn = interaction.options.getUser(
      this.inputNames.playerInInputNames.user,
      true,
    );
    let playerOutOverstat: string;
    let playerInOverstat: string | undefined;

    try {
      playerOutOverstat =
        await this.overstatService.getPlayerOverstat(playerOut);
    } catch (e) {
      await interaction.invisibleReply(
        `Could not find overstat of the player being subbed out in the db. Please have them link it with the /link-overstat command.\nThis may have happened if you had an admin edit your signup players in a ticket.\n` +
          e,
      );
      return;
    }

    try {
      playerInOverstat = await LeagueCommandHelper.VALIDATE_OVERSTAT_LINK(
        playerIn,
        interaction.options.getString(
          this.inputNames.playerInInputNames.overstatLink,
          true,
        ),
        this.overstatService,
      );
    } catch (e) {
      await interaction.invisibleReply(
        `Sub request not valid. Overstat link provided for player subbing in is not valid.\n` +
          e,
      );
      return;
    }

    const additionalComments =
      interaction.options.getString(this.inputNames.additionalComments) ?? "";

    if (!isGuildMember(requestedByMember)) {
      await interaction.invisibleReply(
        "Sub request not made. Signup initiated by member that cannot be found. Contact admin",
      );
      return;
    }

    await interaction.deferReply();

    try {
      const subRequestNumber = await this.leagueService.subRequest(
        VesaDivision[teamDivision],
        teamName,
        WeekNumbers[weekNumber],
        {
          name: playerOut.displayName,
          discordId: playerOut.id,
          overstatLink: playerOutOverstat,
        },
        {
          name: playerIn.displayName,
          discordId: playerIn.id,
          overstatLink: playerInOverstat,
        },
        requestedByMember,
        additionalComments,
      );
      if (subRequestNumber === null) {
        await interaction.followUp(
          "Problem parsing google sheets response, please check sheet to see if your sub request went through before resubmitting",
        );
        return;
      }
      const discordReplyMessage = `Sub requested for __${teamName}__\nSubbing out <@${playerOut.id}>\nSubbing in <@${playerIn.id}>\nRequested week: ${WeekNumbers[weekNumber]}\nSheet row #${subRequestNumber}`;
      await interaction.followUp(discordReplyMessage);
    } catch (e) {
      await interaction.followUp(`Sub request not made. ${e}`);
    }
  }
}

enum WeekNumbers {
  PlacementDay1,
  PlacementDay2,
  PlacementDay3,
  PlacementDay4,
  Week1,
  Week2,
  Week3,
  Week4,
  Week5,
  Week6,
  MatchPoint,
}

function omitKey<T extends object, K extends keyof T>(
  obj: T,
  key: K,
): Omit<T, K> {
  const { [key]: _, ...rest } = obj;
  console.debug(_);
  return rest;
}

const VesaSubRequestDivision = omitKey(VesaDivision, "None");
