import { AdminCommand } from "../../../command";
import { CustomInteraction } from "../../../interaction";
import { BanService } from "../../../../services/ban";
import { setEasternHours } from "../../../../utility/time";
import { AuthService } from "../../../../services/auth";

export class ScrimBanCommand extends AdminCommand {
  inputNames = {
    user1: "user1",
    user2: "user2",
    user3: "user3",
    reason: "reason",
    startDate: "startdate",
    endDate: "enddate",
  };

  constructor(
    authService: AuthService,
    private banService: BanService,
  ) {
    super(authService, "scrim-ban", "Adds a ban entry for up to three players");

    this.addUserInput(this.inputNames.user1, "First user", true);
    this.addDateInput(this.inputNames.endDate, "End date", true);
    this.addStringInput(this.inputNames.reason, "Reason for ban", {
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
      dbIds = await this.banService.addBans(users, startDate, endDate, reason);
    } catch (e) {
      await interaction.editReply("Error while executing scrim ban: " + e);
      return;
    }

    const banIdString = dbIds
      .map((dbId, index) => `<@${users[index]?.id}> ban id: ${dbId}`)
      .join("\n");
    await interaction.deleteReply();
    await interaction.followUp(
      `Scrim banned the following player${users.length === 1 ? "" : "s"} from ${this.formatDate(startDate)} to ${this.formatDate(endDate)}\nReason: ${reason}.\nID's:\n${banIdString}\nAdded by <@${interaction.user.id}>`,
    );
  }
}
