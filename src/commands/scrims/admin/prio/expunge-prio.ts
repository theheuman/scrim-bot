import { AdminCommand } from "../../../command";
import { CustomInteraction } from "../../../interaction";
import { AuthService } from "../../../../services/auth";
import { PrioService } from "../../../../services/prio";

export class ExpungePrioCommand extends AdminCommand {
  constructor(
    authService: AuthService,
    private prioService: PrioService,
  ) {
    super(
      authService,
      "expunge-prio",
      "Removes a prio entry for up to three players",
    );
    this.addStringInput("prio-id1", "A DB id of a prio entry", {
      isRequired: true,
    });
    this.addStringInput("prio-id2", "A DB id of a prio entry", {
      isRequired: false,
    });
    this.addStringInput("prio-id3", "A DB id of a prio entry", {
      isRequired: false,
    });

    // add any inputs you need after calling super()
  }

  async run(interaction: CustomInteraction) {
    const prioId1 = interaction.options.getString("prio-id1", true);
    const prioId2 = interaction.options.getString("prio-id2");
    const prioId3 = interaction.options.getString("prio-id3");

    await interaction.editReply(
      "Fetched all input and working on your request!",
    );

    const prios: string[] = [prioId1, prioId2, prioId3].filter(
      (prio) => prio !== null,
    );
    try {
      const expungedPrios = await this.prioService.expungePlayerPrio(prios);
      const expungeMessageArray = expungedPrios.map(
        (prio) =>
          `Expunged prio of ${prio.amount} on player <@${prio.playerDiscordId}> (${prio.playerDisplayName}) that was set to end on ${this.formatDate(prio.endDate)}`,
      );
      await interaction.deleteReply();
      await interaction.followUp(expungeMessageArray.join("\n"));
    } catch (e) {
      await interaction.editReply("Error while executing expunge prio. " + e);
      return;
    }
  }
}
