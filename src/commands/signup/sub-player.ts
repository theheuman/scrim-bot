import { Command } from "../command";
import { CustomInteraction } from "../interaction";

export class SubPlayerCommand extends Command {
  constructor() {
    super("subplayer", "Replace a player on a team");
    this.addUserInput("remove-player", "Player to remove", true);
    this.addUserInput("add-player", "Player to add", true);
  }

  async run(interaction: CustomInteraction) {
    await interaction.reply("Fetched all input and working on your request!");
    // TODO Implement
  }
}
