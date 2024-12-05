import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { prioService } from "../../services";

// TODO ask for reason and amount in command
module.exports = {
  data: new SlashCommandBuilder()
    .setName("removelowprio")
    .setDescription("Removes a user from the low priority list")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to remove from low priority list")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user");
    if (!user) {
      interaction.reply("User not found, no command executed");
      return;
    }
    await prioService.setPlayerPrio(
      interaction.user,
      [user],
      new Date(),
      new Date(),
      0,
      "Removed from low prio",
    );
    await interaction.reply(
      `User ${user.username} has been removed from the low priority list.`,
    );
  },
};
