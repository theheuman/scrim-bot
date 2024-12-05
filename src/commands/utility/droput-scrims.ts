import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { rosterService } from "../../services";

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

    try {
      await rosterService.removeSignup(
        interaction.user,
        channelId as string,
        teamName as string,
      );
      interaction.reply(`Team ${teamName} has dropped from the signups.`);
    } catch (e) {
      const error = e as Error;
      interaction.reply(`Did NOT remove team from scrim: ${error.message}`);
    }
  },
};
