import { Command } from "../../command";
import { CustomInteraction } from "../../interaction";
import { PrioService } from "../../../services/prio";

export class AddPrioCommand extends Command {
  inputNames = {
    user1: "user1",
    user2: "user2",
    user3: "user3",
    amount: "amount",
    reason: "reason",
    startDate: "startdate",
    endDate: "enddate",
  };

  constructor(private prioService: PrioService) {
    super("addprio", "Adds a prio entry for up to three players", true);

    this.addUserInput(this.inputNames.user1, "First user", true);
    this.addUserInput(this.inputNames.user2, "Second user");
    this.addUserInput(this.inputNames.user3, "Third user");
    this.addNumberInput(
      this.inputNames.amount,
      "Amount of prio, negative for low prio",
      true,
    );
    this.addStringInput(this.inputNames.reason, "Reason fro prio", true);
    this.addStringInput(
      this.inputNames.startDate,
      "Optional start date, defaults to when command is called",
      true,
    );
    this.addStringInput(this.inputNames.endDate, "End date", true);
  }

  async run(interaction: CustomInteraction) {
    const user1 = interaction.options.getUser(this.inputNames.user1, true);
    const user2 = interaction.options.getUser(this.inputNames.user2);
    const user3 = interaction.options.getUser(this.inputNames.user3);
    const amount = interaction.options.getNumber(this.inputNames.amount, true);
    const reason = interaction.options.getString(this.inputNames.reason, true);
    const startDate =
      interaction.options.getDate(this.inputNames.startDate) ?? new Date();
    const endDate = interaction.options.getDate(this.inputNames.endDate, true);
    // end date is inclusive
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
      `Added ${amount} prio to ${users.length} player${users.length === 1 ? "" : "s"} from ${this.formatDate(startDate)} to ${this.formatDate(endDate)} because ${reason}. ${prioReasonString}`,
    );
  }
}
