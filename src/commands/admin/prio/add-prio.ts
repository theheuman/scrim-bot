import { ChatInputCommandInteraction } from "discord.js";
import { prioService } from "../../../services";
import { Command, parseDate } from "../../command";

export class AddPrioCommand extends Command {
  constructor() {
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

  async run(interaction: ChatInputCommandInteraction) {
    const user1 = interaction.options.getUser("user1", true);
    const user2 = interaction.options.getUser("user2");
    const user3 = interaction.options.getUser("user3");
    const amount = interaction.options.getNumber("amount", true);
    const reason = interaction.options.getString("reason", true);
    const startDateString = interaction.options.getString("startDate");
    const endDateString = interaction.options.getString("endDate", true);

    let startDate = new Date();
    try {
      if (startDateString) {
        startDate = parseDate(startDateString, "12 am");
      }
    } catch (e) {
      await interaction.reply("Can't parse start date " + e);
      return;
    }
    let endDate: Date;
    try {
      endDate = parseDate(endDateString, "11:59 pm");
    } catch (e) {
      await interaction.reply("Can't parse end date " + e);
      return;
    }

    const users = [user1, user2, user3].filter((user) => !!user);
    let dbIds: string[];
    try {
      dbIds = await prioService.setPlayerPrio(
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
      `Added ${amount} prio to ${users.length} player${users.length === 1 ? "" : "s"} from ${startDateString} to ${endDateString} because ${reason}. ${prioReasonString}`,
    );
  }
}
