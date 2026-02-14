import { AdminCommand } from "../../command";
import { CustomInteraction } from "../../interaction";
import { AuthService } from "../../../services/auth";
import { EloService } from "../../../services/elo/elo-service";

export class ComputeAllEloCommand extends AdminCommand {
  constructor(
    authService: AuthService,
    private eloService: EloService,
  ) {
    super(
      authService,
      "compute-all-elo",
      "Recalculates Elo for ALL scrims from Hugging Face",
    );
  }

  async run(interaction: CustomInteraction) {
    await interaction.deferReply();
    await interaction.editReply(
      "Starting full Elo recalculation... This may take a while.",
    );

    try {
      await this.eloService.recalculateAllElo(async (msg) => {
        await interaction.editReply(msg);
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply(`Failed to compute Elo: ${error}`);
    }
  }
}
