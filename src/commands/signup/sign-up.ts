import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { ScrimSignups } from "../../services/signups";

export class SignupCommand extends MemberCommand {
  constructor(private signupService: ScrimSignups) {
    super("signup", "Creates a new scrim signup");
    this.addStringInput("teamname", "Team name", {
      isRequired: true,
      minLength: 1,
      maxLength: 25,
    });

    this.addUserInput("player1", "@player1", true);
    this.addUserInput("player2", "@player2", true);
    this.addUserInput("player3", "@player3", true);
  }

  async run(interaction: CustomInteraction) {
    const channelId = interaction.channelId;
    const teamName = interaction.options.getString("teamname", true);
    const signupPlayer = interaction.user;
    const player1 = interaction.options.getUser("player1", true);
    const player2 = interaction.options.getUser("player2", true);
    const player3 = interaction.options.getUser("player3", true);

    // TODO move getting scrimId into signups.addTeam method
    try {
      const signupId = await this.signupService.addTeam(
        channelId as string,
        teamName,
        signupPlayer,
        [player1, player2, player3],
      );
      interaction.reply(
        `Team ${teamName} signed up with players: ${player1}, ${player2}, ${player3}, Signup id: ${signupId}`,
      );
    } catch (error) {
      interaction.reply(`Team not created: ${(error as Error)?.message}`);
    }
  }
}
