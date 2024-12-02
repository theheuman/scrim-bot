import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { prioService } from "../../services";

// TODO get dates, amount and reason. Probably change command to setPrio, or generate a second command with high prio
module.exports = {
  data: new SlashCommandBuilder()
    .setName("addlowprio")
    .setDescription("Adds up to 3 users to the low priority list")
    .addUserOption((option) =>
      option
        .setName("user1")
        .setDescription("First user to add to low priority list")
        .setRequired(true),
    )
    .addUserOption((option) =>
      option
        .setName("user2")
        .setDescription("Second user to add to low priority list")
        .setRequired(false),
    )
    .addUserOption((option) =>
      option
        .setName("user3")
        .setDescription("Third user to add to low priority list")
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const user1 = interaction.options.getUser("user1");
    const user2 = interaction.options.getUser("user2");
    const user3 = interaction.options.getUser("user3");

    const users = [user1, user2, user3].filter((user) => user !== null);

    try {
      await prioService.setPlayerPrio(
        interaction.user,
        users,
        new Date(),
        new Date(),
        -1,
        "Added to low prio",
      );
    } catch (e) {
      await interaction.reply("Error while executing low prio: " + e);
    }

    const userNames = users.map((user) => user?.username).join(", ");
    await interaction.reply(
      `User(s) ${userNames} have been added to the low priority list.`,
    );
  },
};
