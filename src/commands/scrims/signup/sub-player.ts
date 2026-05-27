import { MemberCommand } from "../../command";
import { CustomInteraction } from "../../interaction";
import { RosterService } from "../../../services/rosters";
import { AlertService } from "../../../services/alert";
import { StaticValueService } from "../../../services/static-values";
import {
  buildOverstatWarningMessage,
  isGuildMember,
} from "../../../utility/utility";
import { ScrimSignup } from "../../../models/Scrims";

export class SubPlayerCommand extends MemberCommand {
  inputNames = {
    teamName: "team-name",
    removePlayer: "remove-player",
    addPlayer: "add-player",
  };
  constructor(
    alertService: AlertService,
    private rosterService: RosterService,
    private staticValueService: StaticValueService,
  ) {
    super(alertService, "sub-player", "Replace a player on a team");
    this.addStringInput(this.inputNames.teamName, "team name", {
      isRequired: true,
    });
    this.addUserInput(this.inputNames.removePlayer, "Player to remove", true);
    this.addUserInput(this.inputNames.addPlayer, "Player to add", true);
  }

  async run(interaction: CustomInteraction) {
    if (!isGuildMember(interaction.member)) {
      interaction.invisibleReply(
        "Sub not made. Member using the command not found",
      );
      return;
    }

    const teamName = interaction.options.getString(
      this.inputNames.teamName,
      true,
    );
    const playerToRemove = interaction.options.getUser(
      this.inputNames.removePlayer,
      true,
    );
    const playerToAdd = interaction.options.getUser(
      this.inputNames.addPlayer,
      true,
    );
    await interaction.reply("Fetched all input and working on your request!");

    let team: ScrimSignup;
    try {
      team = await this.rosterService.replaceTeammate(
        interaction.member,
        interaction.channelId,
        teamName,
        playerToRemove,
        playerToAdd,
      );
      await interaction.editReply(
        `Sub made. <@${playerToRemove.id}> replaced by <@${playerToAdd.id}>.\n` +
          `__${teamName}__ new roster: ${team.players.map((player) => this.formatPlayer(player)).join(", ")}`,
      );
    } catch (error) {
      await interaction.editReply("Sub not made. " + error);
      return;
    }

    const newPlayer = team.players.find((p) => p.discordId === playerToAdd.id);
    if (newPlayer && !newPlayer.overstatId) {
      try {
        const requireOverstat =
          await this.staticValueService.requireOverstatForSignup();
        const content = buildOverstatWarningMessage(
          [newPlayer.displayName],
          requireOverstat,
        );
        await interaction.followUp({ content, ephemeral: true });
      } catch (e) {
        await this.alertService.warn(
          `Failed to send overstat warning after sub in channel ${interaction.channelId}: ${e}`,
        );
      }
    }
  }
}
