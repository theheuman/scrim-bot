import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import signups from "../../services/signups";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dropout")
    .setDescription("Drops a team from the signup list")
    .addStringOption((option) =>
      option
        .setName("teamname")
        .setDescription("Team name")
        .setMinLength(1)
        .setMaxLength(150)
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const channelId = interaction.channelId;
    const teamName = interaction.options.getString("teamname");

    // TODO user needs to be on team, or have signed team up to be allowed to remove team
    try {
      await signups.removeTeam(channelId as string, teamName as string);
      interaction.reply(`Team ${teamName} has been dropped from the signups.`);
    } catch (e) {
      const error = e as Error;
      interaction.reply(`Did NOT delete team: ${error.message}`);
    }
  },
};
