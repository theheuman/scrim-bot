import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
} from "discord.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("removeadminrole") // Command name matching file name
    .setDescription("Removes a role that can perform scrim admin actions")
    .addRoleOption((option) =>
      option.setName("role").setDescription("Role to add").setRequired(true),
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
    // Before executing any other code, we need to acknowledge the interaction.
    // Discord only gives us 3 seconds to acknowledge an interaction before
    // the interaction gets voided and can't be used anymore.
    await interaction.reply({
      content: "Fetched all input and working on your request!",
    });
  },
};
