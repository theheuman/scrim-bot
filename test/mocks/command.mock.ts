import { AdminCommand, MemberCommand } from "../../src/commands/command";
import { AuthService } from "../../src/services/auth";
import { AlertService } from "../../src/services/alert";
import { CustomInteraction } from "../../src/commands/interaction";

export class MockAdminCommand extends AdminCommand {
  constructor(alertService: AlertService, authService: AuthService) {
    super(
      alertService,
      authService,
      "mockcommand",
      "fake command to test abstract class",
    );
  }

  run(interaction: CustomInteraction) {
    console.log("Mock command run called", interaction.member);
    return Promise.resolve();
  }
}

export class MockMemberCommand extends MemberCommand {
  constructor(alertService: AlertService) {
    super(alertService, "mockcommand", "fake command to test abstract class");
  }

  run(interaction: CustomInteraction) {
    console.log("Mock command run called", interaction.member);
    return Promise.resolve();
  }
}
