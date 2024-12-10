import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("subplayer")
    .setDescription("Replace a player on a team")
    .addUserOption((option) =>
      option
        .setName("remove-player")
        .setDescription("Player to remove")
        .setRequired(true),
    )
    .addUserOption((option) =>
      option
        .setName("add-player")
        .setDescription("Player to add")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply("Fetched all input and working on your request!");
  },
};
