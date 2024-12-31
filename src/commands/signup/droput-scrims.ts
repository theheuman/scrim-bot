import { rosterService } from "../../services";
import { isGuildMember } from "../../utility/utility";
import { Command } from "../command";
import { CustomInteraction } from "../interaction";

export class DropoutCommand extends Command {
  constructor() {
    super("dropout", "Drops a team from the signup list");
    this.addStringInput("teamname", "Team name", true);
    // .setMinLength(1)
    // .setMaxLength(150)
  }

  async run(interaction: CustomInteraction) {
    const channelId = interaction.channelId;
    const teamName = interaction.options.getString("teamname");

    await interaction.reply("Fetched all input and working on your request!");

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
  }
}
