import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { prioService } from "../../../services";
import { isGuildMember } from "../../../utility/utility";

// TODO ask for reason and amount in command, change execute command to work correctly
module.exports = {
  data: new SlashCommandBuilder()
    .setName("expungeprio")
    .setDescription("Removes a priority entry from the db")
    .addUserOption((option) =>
      option
        .setName("prio-id")
        .setDescription("Prio db id to be removed from priority table")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user");
    if (!user) {
      interaction.reply("User not found, no command executed");
      return;
    }
    if (!isGuildMember(interaction.member)) {
      interaction.reply(
        "Can't find the member issuing the command or this is an api command, no command executed",
      );
      return;
    }
    await prioService.expungePlayerPrio(interaction.member, [user.id]);
    await interaction.reply(
      `User ${user.username} has been removed from the low priority list.`,
    );
  },
};
