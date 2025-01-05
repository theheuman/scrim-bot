import { AdminCommand } from "../../command";
import { CustomInteraction } from "../../interaction";
import { AuthService } from "../../../services/auth";
import { PrioService } from "../../../services/prio";

export class ExpungePrioCommand extends AdminCommand {
  constructor(authService: AuthService, prioService: PrioService) {
    // call super here with the name of the command
    // add any inputs you need after calling super()
  }

  async run(interaction: CustomInteraction) {
    await interaction.reply("Fetched all input and working on your request!");

    // get prio id from interaction

    // in a try catch block
    // send prio id to prioService.expungePrio method
    // reply to interaction that command is successful
    // in catch block reply to interaction that command was unsuccessful
  }
}
