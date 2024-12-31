import { signupsService } from "../../../services";
import { Command } from "../../command";
import { CustomInteraction } from "../../interaction";

export class ComputeScrimCommand extends Command {
  constructor() {
    super("compute-scrim", "Creates a new scrim signup text channel", true);
    this.addStringInput(
      "overstat-link",
      "Full length url of the completed scrim (not short url)",
      true,
    );
    // .setMinLength(20)
    // .setMaxLength(150)
    this.addNumberInput("skill", "Skill level of the lobby");
  }

  async run(interaction: CustomInteraction) {
    // Before executing any other code, we need to acknowledge the interaction.
    // Discord only gives us 3 seconds to acknowledge an interaction before
    // the interaction gets voided and can't be used anymore.
    await interaction.reply({
      content: "Fetched all input and working on your request!",
    });
    const channelId = interaction.channelId;
    const overstatLink = interaction.options.getString("overstat-link", true);
    const skill = interaction.options.getNumber("skill", true);

    try {
      await signupsService.computeScrim(channelId, overstatLink, skill);
    } catch (error) {
      await interaction.reply(`Unable to complete request: ${error}`);
    }

    await interaction.reply(
      "Scrim successfully computed, you can now compute another lobby or close the scrim",
    );
  }
}
