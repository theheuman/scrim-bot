import { AdminCommand } from "../../command";
import { CustomInteraction } from "../../interaction";
import { AuthService } from "../../../services/auth";

// TODO ask for reason and amount in command, change execute command to work correctly
export class ExpungePrioCommand extends AdminCommand {
  constructor(authService: AuthService) {
    super(authService, "expungeprio", "Removes a priority entry from the db");
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
