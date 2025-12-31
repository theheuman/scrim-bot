import { AdminCommand } from "../../../command";
import { CustomInteraction } from "../../../interaction";
import { PrioService } from "../../../../services/prio";
import { setEasternHours } from "../../../../utility/time";
import { AuthService } from "../../../../services/auth";

export class AddPrioCommand extends AdminCommand {
  inputNames = {
    user1: "user1",
    user2: "user2",
    user3: "user3",
    amount: "amount",
    reason: "reason",
    startDate: "startdate",
    endDate: "enddate",
  };

  constructor(
    authService: AuthService,
    private prioService: PrioService,
  ) {
    super(authService, "add-prio", "Adds a prio entry for up to three players");

    this.addUserInput(this.inputNames.user1, "First user", true);
    this.addDateInput(this.inputNames.endDate, "End date", true);
    this.addNumberInput(
      this.inputNames.amount,
      "Amount of prio, negative for low prio",
      true,
    );
    this.addStringInput(this.inputNames.reason, "Reason for prio", {
      isRequired: true,
    });
    this.addUserInput(this.inputNames.user2, "Second user");
    this.addUserInput(this.inputNames.user3, "Third user");
    this.addDateInput(
      this.inputNames.startDate,
      "Optional start date, defaults to when command is called",
    );
  }

  async run(interaction: CustomInteraction) {
    const user1 = interaction.options.getUser(this.inputNames.user1, true);
    const user2 = interaction.options.getUser(this.inputNames.user2);
    const user3 = interaction.options.getUser(this.inputNames.user3);
    const amount = interaction.options.getNumber(this.inputNames.amount, true);
    const reason = interaction.options.getString(this.inputNames.reason, true);
    const startDate =
      interaction.options.getDateTime(this.inputNames.startDate) ?? new Date();
    let endDate = interaction.options.getDateTime(
      this.inputNames.endDate,
      true,
    );

    await interaction.editReply({
      content: "Fetched all input and working on your request!",
    });

    // end date is inclusive
    endDate = setEasternHours(endDate, 23, 59, 59);

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
      await interaction.editReply("Error while executing set prio: " + e);
      return;
    }

    const prioIdString = dbIds
      .map((dbId, index) => `<@${users[index]?.id}> prio id: ${dbId}`)
      .join("\n");
    await interaction.deleteReply();
    await interaction.followUp(
      `Added ${amount} prio to ${users.length} player${users.length === 1 ? "" : "s"} from ${this.formatDate(startDate)} to ${this.formatDate(endDate)}\nReason: ${reason}.\nID's:\n${prioIdString}\nAdded by <@${interaction.user.id}>`,
    );
  }
}
