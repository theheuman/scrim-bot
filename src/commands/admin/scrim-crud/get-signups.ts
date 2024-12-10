import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
} from "discord.js";
import { signupsService } from "../../../services";
import { ScrimSignup } from "../../../models/Scrims";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("get-signups") // Command name matching file name
    .setDescription("Creates a new scrim signup text channel")
    // You will usually only want users that can create new channels to
    // be able to use this command and this is what this line does.
    // Feel free to remove it if you want to allow any users to
    // create new channels
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    // It's impossible to create normal text channels inside DMs, so
    // it's in your best interest in disabling this command through DMs
    // as well. Threads, however, can be created in DMs, but we will see
    // more about them later in this post
    .setDMPermission(false),
  async execute(interaction: ChatInputCommandInteraction) {
    // Before executing any other code, we need to acknowledge the interaction.
    // Discord only gives us 3 seconds to acknowledge an interaction before
    // the interaction gets voided and can't be used anymore.
    await interaction.reply("Fetching teams, command in progress");

    const channelId = interaction.channelId;

    let channelSignups: { mainList: ScrimSignup[]; waitList: ScrimSignup[] };
    try {
      channelSignups = await signupsService.getSignups(channelId);
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
  },
};
