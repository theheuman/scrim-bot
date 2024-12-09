import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { rosterService } from "../../services";
import { isGuildMember } from "../../utility/utility";

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

    if (!isGuildMember(interaction.member)) {
      interaction.reply(
        "Can't find the member issuing the command or this is an api command, no command executed",
      );
      return;
    }

    try {
      await rosterService.removeSignup(
        interaction.member,
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
