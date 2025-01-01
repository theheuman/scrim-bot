import { Command } from "../command";
import { CustomInteraction } from "../interaction";
import { ScrimSignups } from "../../services/signups";

export class SignupCommand extends Command {
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
    const teamName = interaction.options.getString("teamname");
    const signupPlayer = interaction.user;
    const player1 = interaction.options.getUser("player1");
    const player2 = interaction.options.getUser("player2");
    const player3 = interaction.options.getUser("player3");

    if (!teamName) {
      await interaction.reply(`Signup NOT registered, no team name provided`);
      return;
    } else if (!player1 || !player2 || !player3) {
      await interaction.reply(
        `Signup NOT registered, a team needs three players`,
      );
      return;
    }

    // TODO move getting scrimId into signups.addTeam method
    const scrimId = this.signupService.getScrimId(channelId as string);
    if (scrimId) {
      try {
        const signupId = await this.signupService.addTeam(
          scrimId,
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
    } else {
      interaction.reply(
        "Associated scrim not found, team not created, this is probably a configuration error, contact admins",
      );
    }
  }
}
