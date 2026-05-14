import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { isGuildMember, omitKey } from "../../utility/utility";
import { OverstatService } from "../../services/overstat";
import { VesaDivision } from "../../models/league-models";
import { LeagueCommandHelper } from "./league-command-helper";
import { LeagueService } from "../../services/league";
import { StaticValueService } from "../../services/static-values";
import { AlertService } from "../../services/alert";

export class LeagueSubRequestCommand extends MemberCommand {
  inputNames = {
    teamName: "team-name",
    teamDivision: "team-division",
    weekNumber: "week-number",

    playerOutInputNames: {
      user: "player-out",
      overstatLink: "player-out-overstat-link",
    },

    playerInInputNames: {
      user: "player-in",
      overstatLink: "player-in-overstat-link",
      division: "player-in-division",
    },
    additionalComments: "additional-comments",
  };

  constructor(
    alertService: AlertService,
    private overstatService: OverstatService,
    private leagueService: LeagueService,
    private staticValueService: StaticValueService,
  ) {
    super(alertService, "sub-request", "Request a sub");
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
      `Which week`,
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

    this.addChoiceInput(
      this.inputNames.playerInInputNames.division,
      "Sub's current VESA league division",
      VesaDivision,
      true,
    );

    this.addStringInput(
      this.inputNames.playerOutInputNames.overstatLink,
      `Overstat link of the player subbing out. Only needed if not already linked`,
    );

    this.addStringInput(
      this.inputNames.additionalComments,
      `Any additional details about this sub, or comments? (how many games, subbed previously? etc.)`,
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
    const playerInDivision = interaction.options.getChoice(
      this.inputNames.playerInInputNames.division,
      VesaDivision,
      true,
    );

    if (
      playerInDivision !== VesaDivision.None &&
      playerInDivision < teamDivision
    ) {
      await interaction.invisibleReply(
        `Sub request not made. The player subbing in is in ${VesaDivision[playerInDivision]} which is a higher division than the team's division (${VesaDivision[teamDivision]}).`,
      );
      return;
    }

    const requestedByMember = interaction.member;
    const playerOut = interaction.options.getUser(
      this.inputNames.playerOutInputNames.user,
      true,
    );
    const playerIn = interaction.options.getUser(
      this.inputNames.playerInInputNames.user,
      true,
    );
    let playerOutOverstat: string | undefined;
    let playerInOverstat: string | undefined;

    const playerOutOverstatInput = interaction.options.getString(
      this.inputNames.playerOutInputNames.overstatLink,
    );
    try {
      playerOutOverstat = await LeagueCommandHelper.VALIDATE_OVERSTAT_LINK(
        playerOut,
        playerOutOverstatInput ?? "none",
        this.overstatService,
      );
    } catch (e) {
      await interaction.invisibleReply(
        `Sub request not made. The overstat link provided for the player subbing out is not valid.\n` +
          e,
      );
      return;
    }
    if (playerOutOverstat === undefined && playerOutOverstatInput === null) {
      await interaction.invisibleReply(
        `Sub request not made. No overstat link found for the player being subbed out. Please retry the command with the player-out-overstat-link filled in or write "None" if they do not have one.`,
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
        `Sub request not made. Overstat link provided for player subbing in is not valid.\n` +
          e,
      );
      return;
    }

    const additionalComments =
      interaction.options.getString(this.inputNames.additionalComments) ?? "";

    if (!isGuildMember(requestedByMember)) {
      await interaction.invisibleReply(
        "Sub request not made. Request initiated by member that cannot be found. Contact admin",
      );
      return;
    }

    await interaction.deferReply();

    const subApprovalRoleId =
      await this.staticValueService.getSubApprovalRoleId();
    const roleMention = subApprovalRoleId ? `\n<@&${subApprovalRoleId}>` : "";
    const playerOutOverstatText = playerOutOverstat
      ? ` [Overstat](<${playerOutOverstat}>)`
      : "";
    const playerInOverstatText = playerInOverstat
      ? ` [Overstat](<${playerInOverstat}>)`
      : "";

    if (weekNumber <= WeekNumbers.PlacementDay4) {
      const discordReplyMessage = `Sub requested for __${teamName}__ (${VesaDivision[teamDivision]})\nSubbing out <@${playerOut.id}>${playerOutOverstatText}\nSubbing in <@${playerIn.id}>${playerInOverstatText}\nRequested week: ${WeekNumbers[weekNumber]}${roleMention}`;
      await interaction.followUp(discordReplyMessage);
      return;
    }

    try {
      const subResult = await this.leagueService.subRequest(
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
        VesaDivision[playerInDivision],
        requestedByMember,
        additionalComments,
      );
      if (subResult.rowNumber === null) {
        await interaction.followUp(
          `Problem parsing google sheets response, please check sheet to see if your sub request went through before resubmitting\n<${subResult.sheetUrl}>`,
        );
        return;
      } else {
        const discordReplyMessage = `Sub requested for __${teamName}__ (${VesaDivision[teamDivision]})\nSubbing out <@${playerOut.id}>${playerOutOverstatText}\nSubbing in <@${playerIn.id}>${playerInOverstatText}\nRequested week: ${WeekNumbers[weekNumber]}\n[Sheet row #${subResult.rowNumber}](<${subResult.sheetUrl}>)\nNavigate to the "${subResult.tabName}" tab at the bottom of the sheet${roleMention}`;
        await interaction.followUp(discordReplyMessage);
      }
      if (!playerInOverstat) {
        await interaction.followUp(
          `<@${requestedByMember.id}> No overstat provided for the player subbing in, please reply to this message with screenshots of the entire screen showing their ranked stats from the last two seasons in this channel.`,
        );
      }
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

const VesaSubRequestDivision = omitKey(VesaDivision, "None");
