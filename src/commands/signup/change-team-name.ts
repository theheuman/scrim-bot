import { CustomInteraction } from "../interaction";
import { Command } from "../command";

export class ChangeTeamNameCommand extends Command {
  constructor() {
    super("changeteamname", "Change the name of a team");
    this.addStringInput("old-team-name", "Old name", true);
    this.addStringInput("new-name", "New name", true);
  }

  async run(interaction: CustomInteraction) {
    await interaction.reply("Fetched all input and working on your request!");
    // TODO implementation
  }
}
