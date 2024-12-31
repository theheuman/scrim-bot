import { Command } from "../../command";
import { CustomInteraction } from "../../interaction";
import { format } from "date-fns";
import { PrioService } from "../../../services/prio";

export class AddPrioCommand extends Command {
  constructor(private prioService: PrioService) {
    super("addprio", "Adds a prio entry for up to three players", true);

    this.addUserInput("user1", "First user", true);
    this.addUserInput("user2", "Second user");
    this.addUserInput("user3", "Third user");
    this.addNumberInput(
      "amount",
      "Amount of prio, negative for low prio",
      true,
    );
    this.addStringInput("reason", "Reason fro prio", true);
  }

  async run(interaction: CustomInteraction) {
    const user1 = interaction.options.getUser("user1", true);
    const user2 = interaction.options.getUser("user2");
    const user3 = interaction.options.getUser("user3");
    const amount = interaction.options.getNumber("amount", true);
    const reason = interaction.options.getString("reason", true);
    const startDate = interaction.options.getDate("startDate") ?? new Date();
    const endDate = interaction.options.getDate("endDate", true);
    endDate?.setHours(23, 59, 59);

    const users = [user1, user2, user3].filter((user) => !!user);
    let dbIds: string[];
    try {
      dbIds = await this.prioService.setPlayerPrio(
        users,
        startDate,
        endDate,
        amount,
        reason,
      );
    } catch (e) {
      await interaction.reply("Error while executing set prio: " + e);
      return;
    }

    const prioReasonString = dbIds
      .map((dbId, index) => `${users[index]?.displayName} prio id: ${dbId}`)
      .join("; ");
    console.log(user1, user2, user3, users);
    await interaction.reply(
      `Added ${amount} prio to ${users.length} player${users.length === 1 ? "" : "s"} from ${format(startDate, "M/dd hh:mm a")} to ${format(endDate, "M/dd hh:mm a")} because ${reason}. ${prioReasonString}`,
    );
  }
}
