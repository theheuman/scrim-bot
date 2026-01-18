import { AdminCommand } from "../../command";
import { AuthService } from "../../../services/auth";
import { CustomInteraction } from "../../interaction";

export class RoleAssignmentCommand extends AdminCommand {
  inputNames = {
    role: "role",
    userIds: "user-ids",
  };

  constructor(authService: AuthService) {
    super(authService, "role-assign", "Assign a role to a list of user id's");

    this.addRoleInput(
      this.inputNames.role,
      "Role for users to be added to",
      true,
    );
    this.addStringInput(
      this.inputNames.userIds,
      "Users to be assigned to the role",
      {
        isRequired: true,
      },
    );
  }

  async run(interaction: CustomInteraction) {
    const role = interaction.options.getRole(this.inputNames.role, true);
    const userIdString = interaction.options.getString(
      this.inputNames.userIds,
      true,
    );

    if (!("editable" in role)) {
      await interaction.editReply(
        "Role sent is not of type Role, contact bot admin",
      );
      return;
    }

    const userIds = userIdString
      .split(/[ ,]+/)
      .filter((id) => id.trim().length > 0);
    let successCount = 0;
    const failureIds = [];
    for (const id of userIds) {
      try {
        const member = await interaction.guild?.members.fetch(id);
        await member?.roles.add(role);
        successCount++;
      } catch (e) {
        console.error(`Failed to add role to ${id}.\n`, e);
        failureIds.push(id);
      }
    }
    if (successCount > 0) {
      let message = `Successfully added the role to ${successCount} member(s).`;
      if (failureIds.length > 0) {
        message += `\nFailed to add to ${failureIds.length}: ${failureIds.join(", ")}`;
      }
      await interaction.followUp(message);
    } else {
      let message = "Failed to add role to any users";
      if (failureIds.length > 0) {
        message += `\nFailed to add to ${failureIds.length}: ${failureIds.join(", ")}`;
      }
      await interaction.followUp(message);
    }
  }
}
