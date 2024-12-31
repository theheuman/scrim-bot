import { Command } from "../../command";
import { CustomInteraction } from "../../interaction";

// TODO ask for reason and amount in command, change execute command to work correctly
export class ExpungePrioCommand extends Command {
  constructor() {
    super("expungeprio", "Removes a priority entry from the db", true);
    this.addNumberInput(
      "prio-id",
      "Prio db id to be removed from priority table",
      true,
    );
  }

  async run(interaction: CustomInteraction) {
    // TODO implement
    console.log(interaction);
  }
}
