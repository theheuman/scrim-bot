import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("expungeprio")
    .setDescription("Removes a priority entry from the db")
    .addUserOption((option) =>
      option
        .setName("prio-id")
        .setDescription("Prio db id to be removed from priority table")
        .setRequired(true),
    )
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
    await interaction.reply("Fetched all input and working on your request!");

    // check if member issuing the command is an admin

    // get prio id from interaction

    // in a catch try block
    // send prio id to prioService
    // reply to interaction that command is successful
    // in catch block reply to interaction that command was unsuccessful
  },
};
