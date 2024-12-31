import { signupsService } from "../../../services";
import { Command } from "../../command";
import { CustomInteraction } from "../../interaction";

export class CloseScrimCommand extends Command {
  constructor() {
    super("close-scrim", "Creates a new scrim signup text channel", true);
  }

  async run(interaction: CustomInteraction) {
    // Before executing any other code, we need to acknowledge the interaction.
    // Discord only gives us 3 seconds to acknowledge an interaction before
    // the interaction gets voided and can't be used anymore.
    await interaction.reply({
      content: "Fetched all input and working on your request!",
    });
    const channelId = interaction.channelId;

    await signupsService.closeScrim(channelId);

    // TODO after closing the scrim delete the channel
  }
}
