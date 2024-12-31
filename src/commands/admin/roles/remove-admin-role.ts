import { Command } from "../../command";
import { CustomInteraction } from "../../interaction";

export class RemoveAdminRoleCommand extends Command {
  constructor() {
    super(
      "removeadminrole",
      "Removes a role from performing scrim admin actions",
    );
    this.addRoleInput("role", "Role to remove", true);
  }

  async run(interaction: CustomInteraction) {
    // Before executing any other code, we need to acknowledge the interaction.
    // Discord only gives us 3 seconds to acknowledge an interaction before
    // the interaction gets voided and can't be used anymore.
    await interaction.reply({
      content: "Fetched all input and working on your request!",
    });
    // TODO implement
  }
}
