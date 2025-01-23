import { AdminCommand } from "../../command";
import { CustomInteraction } from "../../interaction";
import { AuthService } from "../../../services/auth";
import { PrioService } from "../../../services/prio";

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
    await interaction.reply("Fetched all input and working on your request!");

    // get prio id from interaction
    const prioId1 = interaction.options.getString("prio-id1", true);
    const prioId2 = interaction.options.getString("prio-id2");
    const prioId3 = interaction.options.getString("prio-id3");
    // in a try catch block
    const prios: string[] = [prioId1, prioId2, prioId3].filter(
      (prio) => !!prio,
    ) as unknown as string[];
    try {
      const expungePlayers = await this.prioService.expungePlayerPrio(prios);
      await interaction.reply(
        `Expunged prio of ${expungePlayers[0].amount} on player <@${expungePlayers[0].playerDiscordId}> (${expungePlayers[0].playerDisplayName}) that was set to end on ${this.formatDate(expungePlayers[0].endDate)}`,
      );
    } catch (e) {
      await interaction.reply("Error while executing set prio: " + e);
      return;
    }
    // send prio id to prioService.expungePrio method
    // reply to interaction that command is successful
    // in catch block reply to interaction that command was unsuccessful
  }
}
