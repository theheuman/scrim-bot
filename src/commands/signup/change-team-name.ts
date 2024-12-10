import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("changeteamname")
    .setDescription("Change the name of a team")
    .addStringOption((option) =>
      option
        .setName("old-team-name")
        .setDescription("Old name")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("new-name").setDescription("New name").setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply("Fetched all input and working on your request!");
  },
};
