import { AdminCommand } from "../../../command";
import { CustomInteraction } from "../../../interaction";
import { AuthService } from "../../../../services/auth";

export class RemoveAdminRoleCommand extends AdminCommand {
  constructor(authService: AuthService) {
    super(
      authService,
      "remove-admin-role",
      "Removes a role from performing scrim admin actions",
    );
    this.addRoleInput("role", "Role to remove", true);
  }

  async run(interaction: CustomInteraction) {
    const role = interaction.options.getRole("role", true);

    await interaction.editReply({
      content: "Fetched all input and working on your request!",
    });

    try {
      await this.authService.removeAdminRoles([role.id]);
      await interaction.deleteReply();
      await interaction.followUp(`Scrim bot admin role <@&${role.id}> removed`);
    } catch (e) {
      await interaction.editReply("Error while removing admin role. " + e);
    }
  }
}
