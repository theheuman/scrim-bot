import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { isGuildMember, omitKey } from "../../utility/utility";
import { OverstatService } from "../../services/overstat";
import { VesaDivision } from "../../models/league-models";
import { LeagueCommandHelper } from "./league-command-helper";
import { LeagueService } from "../../services/league";
import { StaticValueService } from "../../services/static-values";

export class RosterChangeCommand extends MemberCommand {
  inputNames = {
    teamName: "team-name",
    teamDivision: "team-division",

    playerOutInputNames: {
      user: "player-out",
      overstatLink: "player-out-overstat-link",
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
    private staticValueService: StaticValueService,
  ) {
    super("roster-change", "Request a roster change");
    this.addStringInput(this.inputNames.teamName, "Team name", {
      isRequired: true,
      minLength: 1,
      maxLength: 25,
    });

    this.addChoiceInput(
      this.inputNames.teamDivision,
      `Which division or placement lobby is your team playing in`,
      VesaRosterChangeDivision,
      true,
    );

    this.addUserInput(
      this.inputNames.playerOutInputNames.user,
      "@player being removed",
      true,
    );
    this.addUserInput(
      this.inputNames.playerInInputNames.user,
      "@player being added",
      true,
    );

    this.addStringInput(
      this.inputNames.playerInInputNames.overstatLink,
      `Overstat link of the player being added. Write "None" if they do not have one`,
      {
        isRequired: true,
      },
    );

    this.addStringInput(
      this.inputNames.playerOutInputNames.overstatLink,
      `Overstat link of the player being removed. Only needed if not already linked`,
    );

    this.addStringInput(
      this.inputNames.additionalComments,
      `Any additional details or comments?`,
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
        `Roster change not made. The overstat link provided for the player being removed is not valid.\n` +
          e,
      );
      return;
    }
    if (playerOutOverstat === undefined && playerOutOverstatInput === null) {
      await interaction.invisibleReply(
        `Roster change not made. No overstat link found for player being removed from the roster. Please retry the command with the player-out-overstat-link filled in or write "None" if they do not have one.`,
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
        `Roster change not made. Overstat link provided for player being added is not valid.\n` +
          e,
      );
      return;
    }

    const additionalComments =
      interaction.options.getString(this.inputNames.additionalComments) ?? "";

    if (!isGuildMember(requestedByMember)) {
      await interaction.invisibleReply(
        "Roster change not made. Request initiated by member that cannot be found. Contact admin",
      );
      return;
    }

    await interaction.deferReply();

    try {
      const rosterResult = await this.leagueService.rosterChange(
        VesaDivision[teamDivision],
        teamName,
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
      if (rosterResult.rowNumber === null) {
        await interaction.followUp(
          `Problem parsing google sheets response, please check sheet to see if your roster change went through before resubmitting\n<${rosterResult.sheetUrl}>`,
        );
        return;
      }
      const subApprovalRoleId =
        await this.staticValueService.getSubApprovalRoleId();
      const roleMention = subApprovalRoleId ? `\n<@&${subApprovalRoleId}>` : "";
      const playerOutOverstatText = playerOutOverstat
        ? ` [Overstat](<${playerOutOverstat}>)`
        : "";
      const playerInOverstatText = playerInOverstat
        ? ` [Overstat](<${playerInOverstat}>)`
        : "";
      const discordReplyMessage = `Roster change requested for __${teamName}__ (${VesaDivision[teamDivision]})\nRemoving <@${playerOut.id}>${playerOutOverstatText}\nAdding <@${playerIn.id}>${playerInOverstatText}\n[Sheet row #${rosterResult.rowNumber}](<${rosterResult.sheetUrl}>)\nNavigate to the "${rosterResult.tabName}" tab at the bottom of the sheet${roleMention}`;
      await interaction.followUp(discordReplyMessage);
    } catch (e) {
      await interaction.followUp(`Roster change not made. ${e}`);
    }
  }
}

const VesaRosterChangeDivision = omitKey(VesaDivision, "None");
