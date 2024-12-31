import { ScrimSignup } from "../../../models/Scrims";
import { Command } from "../../command";
import { CustomInteraction } from "../../interaction";
import { ScrimSignups } from "../../../services/signups";

export class GetSignupsCommand extends Command {
  constructor(private signupService: ScrimSignups) {
    super("get-signups", "Creates a new scrim signup text channel", true);
  }

  async run(interaction: CustomInteraction) {
    // Before executing any other code, we need to acknowledge the interaction.
    // Discord only gives us 3 seconds to acknowledge an interaction before
    // the interaction gets voided and can't be used anymore.
    await interaction.reply("Fetching teams, command in progress");

    const channelId = interaction.channelId;

    let channelSignups: { mainList: ScrimSignup[]; waitList: ScrimSignup[] };
    try {
      channelSignups = await this.signupService.getSignups(channelId);
    } catch (e) {
      await interaction.reply(`Could not fetch signups ${e}`);
      return;
    }

    const { mainList, waitList } = channelSignups;

    const formatTeams = (teams: ScrimSignup[], startIndex: number) => {
      return teams
        .map((signup, index) => {
          const players = signup.players
            .map((player) => `<@${player.id}>`)
            .join(", ");

          return `${startIndex + index + 1}. ${signup.teamName}: ${players} Priority: ${signup.prio ?? 0}`;
        })
        .join("");
    };

    const sendMessages = async (messages: string[]) => {
      for (const message of messages) {
        await interaction.followUp({ content: message, ephemeral: true });
      }
    };

    const messages: string[] = [];
    let currentMessage = "Signed up teams for one lobby:\n";

    const addTeamsToMessages = (teams: ScrimSignup[], startIndex: number) => {
      for (let i = 0; i < teams.length; i += 20) {
        const chunk = teams.slice(i, i + 20);
        currentMessage += formatTeams(chunk, startIndex + i);
        messages.push(currentMessage);
        currentMessage = "Waitlist or multiple lobbies:\n";
      }
    };

    addTeamsToMessages(mainList, 0);
    addTeamsToMessages(waitList, mainList.length);

    await interaction.reply({ content: messages.shift()!, ephemeral: true });
    await sendMessages(messages);
  }
}
