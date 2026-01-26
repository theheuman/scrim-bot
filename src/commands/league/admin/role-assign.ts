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
    const failures: { id: string; reason: string }[] = [];
    for (const id of userIds) {
      try {
        const member = await interaction.guild?.members.fetch(id);
        await member?.roles.add(role);
        successCount++;
      } catch (e) {
        console.error(`Failed to add role to ${id}.\n`, e);
        failures.push({ id, reason: `${e}`.split("\n")[0] });
      }
    }
    let message: string;
    if (successCount > 0) {
      message = `Successfully added the <@&${role.id}> role to ${successCount} member(s).`;
    } else {
      message = `Failed to add <@&${role.id}> to any users`;
    }
    if (failures.length > 0) {
      message += this.getFailureString(failures, userIds.length);
    }
    if (message.length >= 2000) {
      message = message.slice(0, 1900);
      message +=
        "...\nMessage length trimmed due to amount of errors, reach out to bot admin if you need more info";
    }
    await interaction.followUp(message);
  }

  private getFailureString(
    failures: { id: string; reason: string }[],
    totalCount: number,
  ): string {
    return `\nFailed to add to ${failures.length} out of ${totalCount}:\n${failures.map((failure) => `${failure.id}: ${failure.reason}`).join("\n")}`;
  }
}
