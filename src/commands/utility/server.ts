import { CommandInteraction } from "discord.js";
import { MemberCommand } from "../command";

export class ServerInfoCommand extends MemberCommand {
  constructor() {
    super("server", "Provides information about the server.");
  }

  async run(interaction: CommandInteraction) {
    const server = interaction.guild;

    if (server) {
      await interaction.reply(
        `This server is ${server.name} and has ${server.memberCount} members.`,
      );
    } else {
      await interaction.reply(
        `I couldn't retrieve information about this server.`,
      );
    }
  }
}
