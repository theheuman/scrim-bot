import { CustomInteraction } from "../interaction";
import { MemberCommand } from "../command";
import { RosterService } from "../../services/rosters";
import { isGuildMember } from "../../utility/utility";

export class ChangeTeamNameCommand extends MemberCommand {
  inputNames = {
    oldName: "old-team-name",
    newName: "new-team-name",
  };

  constructor(private rosterService: RosterService) {
    super("change-team-name", "Change the name of a team");
    this.addStringInput(this.inputNames.oldName, "Old name", {
      isRequired: true,
      minLength: 1,
      maxLength: 25,
    });
    this.addStringInput(this.inputNames.newName, "New name", {
      isRequired: true,
      minLength: 1,
      maxLength: 25,
    });
  }

  async run(interaction: CustomInteraction) {
    if (!isGuildMember(interaction.member)) {
      interaction.invisibleReply(
        "Team name not changed. Member using the command not found",
      );
      return;
    }

    const oldName = interaction.options.getString(
      this.inputNames.oldName,
      true,
    );
    const newName = interaction.options.getString(
      this.inputNames.newName,
      true,
    );

    await interaction.reply("Fetched all input and working on your request!");

    try {
      await this.rosterService.changeTeamName(
        interaction.member,
        interaction.channelId,
        oldName,
        newName,
      );
      await interaction.editReply(
        `Team name changed. __${oldName}__ is now called __${newName}__`,
      );
    } catch (error) {
      await interaction.editReply("Team name not changed. " + error);
    }
  }
}
