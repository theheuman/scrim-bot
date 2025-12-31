import { isGuildMember } from "../../../utility/utility";
import { MemberCommand } from "../../command";
import { CustomInteraction } from "../../interaction";
import { RosterService } from "../../../services/rosters";

export class DropoutCommand extends MemberCommand {
  inputNames = {
    teamName: "team-name",
  };
  constructor(private rosterService: RosterService) {
    super("dropout", "Drops a team from the signup list");
    this.addStringInput(this.inputNames.teamName, "Team name", {
      isRequired: true,
      minLength: 1,
      maxLength: 25,
    });
  }

  async run(interaction: CustomInteraction) {
    if (!isGuildMember(interaction.member)) {
      interaction.invisibleReply(
        "Did NOT remove team from scrim. Member issuing command not found",
      );
      return;
    }

    const channelId = interaction.channelId;
    const teamName = interaction.options.getString(this.inputNames.teamName);

    await interaction.reply("Fetched all input and working on your request!");

    try {
      await this.rosterService.removeSignup(
        interaction.member,
        channelId as string,
        teamName as string,
      );
      await interaction.editReply(
        `Team __${teamName}__ has dropped from the signups.`,
      );
    } catch (e) {
      const error = e as Error;
      await interaction.editReply("Did NOT remove team from scrim. " + error);
    }
  }
}
