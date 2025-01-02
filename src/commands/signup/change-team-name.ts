import { CustomInteraction } from "../interaction";
import { MemberCommand } from "../command";

export class ChangeTeamNameCommand extends MemberCommand {
  constructor() {
    super("changeteamname", "Change the name of a team");
    this.addStringInput("old-team-name", "Old name", {
      isRequired: true,
      minLength: 1,
      maxLength: 25,
    });
    this.addStringInput("new-name", "New name", {
      isRequired: true,
      minLength: 1,
      maxLength: 25,
    });
  }

  async run(interaction: CustomInteraction) {
    await interaction.reply("Fetched all input and working on your request!");
    // TODO implementation
  }
}
