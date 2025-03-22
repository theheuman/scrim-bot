import { AdminCommand, MemberCommand } from "../../src/commands/command";
import { AuthService } from "../../src/services/auth";
import { CustomInteraction } from "../../src/commands/interaction";

export class MockAdminCommand extends AdminCommand {
  constructor(authService: AuthService) {
    super(authService, "mockcommand", "fake command to test abstract class");
  }

  run(interaction: CustomInteraction) {
    console.log("Mock command run called", interaction.member);
    return Promise.resolve();
  }
}

export class MockMemberCommand extends MemberCommand {
  constructor() {
    super("mockcommand", "fake command to test abstract class");
  }

  run(interaction: CustomInteraction) {
    console.log("Mock command run called", interaction.member);
    return Promise.resolve();
  }
}
