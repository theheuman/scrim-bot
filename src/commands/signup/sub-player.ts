import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { RosterService } from "../../services/rosters";
import { isGuildMember } from "../../utility/utility";

export class SubPlayerCommand extends MemberCommand {
  inputNames = {
    teamName: "team-name",
    removePlayer: "remove-player",
    addPlayer: "add-player",
  };
  constructor(private rosterService: RosterService) {
    super("sub-player", "Replace a player on a team");
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

    try {
      await this.rosterService.replaceTeammate(
        interaction.member,
        interaction.channelId,
        teamName,
        playerToRemove,
        playerToAdd,
      );
      await interaction.editReply(
        `Sub made. <@${playerToRemove.id}> replaced by <@${playerToAdd.id}>.`,
      );
    } catch (error) {
      await interaction.editReply("Sub not made. " + error);
    }
  }
}
