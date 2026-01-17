import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { isGuildMember } from "../../utility/utility";
import { OverstatService } from "../../services/overstat";
import { OAuth2Client } from "googleapis-common";
import { sheets } from "@googleapis/sheets";
import { SheetHelper, SpreadSheetType } from "../../utility/sheet-helper";
import {
  VesaDivision,
  LeagueSubRequestPlayer,
} from "../../models/league-models";
import { LeagueCommandHelper } from "./league-command-helper";

export class LeagueSubRequestCommand extends MemberCommand {
  inputNames = {
    teamName: "team-name",
    teamDivision: "team-division",
    date: "date",

    playerOutInputNames: {
      user: "player-out",
    },

    playerInInputNames: {
      user: "player-in",
      overstatLink: "player-in-overstat-link",
    },
  };

  constructor(private overstatService: OverstatService) {
    super("sub-request", "Request a sub");
    this.addStringInput(this.inputNames.teamName, "Team name", {
      isRequired: true,
      minLength: 1,
      maxLength: 25,
    });

    this.addChoiceInput(
      this.inputNames.teamDivision,
      `Which division or placement lobby is your team playing in`,
      VesaDivision,
      true,
    );

    this.addStringInput(
      this.inputNames.date,
      `The date this sub will play. Ex: Monday Jan 19th, or similar`,
      { isRequired: true },
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
    const subbingDate = interaction.options.getString(
      this.inputNames.date,
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

    if (!isGuildMember(requestedByMember)) {
      await interaction.invisibleReply(
        "Sub request not made. Signup initiated by member that cannot be found. Contact admin",
      );
      return;
    }

    await interaction.deferReply();

    try {
      const subRequestNumber = await this.postSpreadSheetValue(
        teamName,
        VesaDivision[teamDivision],
        subbingDate,
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
      );
      if (subRequestNumber === null) {
        await interaction.followUp(
          "Problem parsing google sheets response, please check sheet to see if your sub request went through before resubmitting",
        );
        return;
      }
      const discordReplyMessage = `Sub requested for __${teamName}__\nSubbing out <@${playerOut.id}>\nSubbing in <@${playerIn.id}>\nRequested date: ${subbingDate}\nSheet row #${subRequestNumber}`;
      await interaction.followUp(discordReplyMessage);
    } catch (e) {
      await interaction.followUp(`Sub request not made. ${e}`);
    }
  }

  async postSpreadSheetValue(
    teamName: string,
    teamDivision: string,
    subDate: string,
    player1: LeagueSubRequestPlayer,
    player2: LeagueSubRequestPlayer,
  ): Promise<number | null> {
    const authClient = await SheetHelper.GET_AUTH_CLIENT();

    const values = [
      [
        new Date().toISOString(),
        teamName,
        teamDivision,
        subDate,
        ...this.convertPlayerToSheetsFormat(player1),
        ...this.convertPlayerToSheetsFormat(player2),
      ],
    ];

    const request = SheetHelper.BUILD_REQUEST(
      values,
      authClient as OAuth2Client,
      SpreadSheetType.PROD_SUB_REQUEST_SHEET,
    );

    const sheetsClient = sheets({ version: "v4" });
    const response = await sheetsClient.spreadsheets.values.append(request);
    console.log(response.data);
    const rowNumber = SheetHelper.GET_ROW_NUMBER_FROM_UPDATE_RESPONSE(
      response.data.updates,
    );
    return rowNumber ? rowNumber - SheetHelper.STARTING_CELL_OFFSET : null;
  }

  private convertPlayerToSheetsFormat(
    player: LeagueSubRequestPlayer,
  ): (string | number)[] {
    return [
      player.name,
      player.discordId,
      player.overstatLink ?? "No overstat",
    ];
  }
}
