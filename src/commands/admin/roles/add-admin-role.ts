import { AdminCommand } from "../../command";
import { CustomInteraction } from "../../interaction";
import { AuthService } from "../../../services/auth";

export class AddAdminRoleCommand extends AdminCommand {
  constructor(authService: AuthService) {
    super(
      authService,
      "add-admin-role",
      "Adds a role that can perform scrim admin actions",
    );
    this.addRoleInput("role", "Role to add", true);
  }

  async run(interaction: CustomInteraction) {
    const role = interaction.options.getRole("role", true);

    await interaction.editReply({
      content: "Fetched all input and working on your request!",
    });

    try {
      await this.authService.addAdminRoles([
        { discordRoleId: role.id, roleName: role.name },
      ]);
      await interaction.editReply(`Scrim bot admin role <@&${role.id}> added`);
    } catch (e) {
      await interaction.editReply("Error while adding admin role. " + e);
    }
  }
}
