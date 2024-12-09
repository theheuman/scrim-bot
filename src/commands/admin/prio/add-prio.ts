import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { prioService } from "../../../services";
import { isGuildMember } from "../../../utility/utility";

// TODO get dates, amount and reason. Probably change command to setPrio, or generate a second command with high prio
module.exports = {
  data: new SlashCommandBuilder()
    .setName("addprio")
    .setDescription("Adds a prio entry for up to three players")
    .addUserOption((option) =>
      option.setName("user1").setDescription("First user").setRequired(true),
    )
    .addUserOption((option) =>
      option.setName("user2").setDescription("Second user").setRequired(false),
    )
    .addUserOption((option) =>
      option.setName("user3").setDescription("Third user").setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!isGuildMember(interaction.member)) {
      await interaction.reply(
        "Can't find the member issuing the command or this is an api command, no command executed",
      );
      return;
    }

    const user1 = interaction.options.getUser("user1");
    const user2 = interaction.options.getUser("user2");
    const user3 = interaction.options.getUser("user3");

    const users = [user1, user2, user3].filter((user) => user !== null);

    try {
      await prioService.setPlayerPrio(
        interaction.member,
        users,
        new Date(),
        new Date(),
        -400,
        "Prio reason",
      );
    } catch (e) {
      await interaction.reply("Error while executing low prio: " + e);
    }

    // TODO reply with actual data
    await interaction.reply(
      "Added -400 prio to 3 players from 1/12/25 to 1/13/25 because Prio reason. Supreme added prio with id: db id; Supreme added prio with id: db id 2; Supreme added prio with id: db id 3",
    );
  },
};
