import { isGuildMember } from "../../utility/utility";
import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { RosterService } from "../../services/rosters";

export class DropoutCommand extends MemberCommand {
  constructor(private rosterService: RosterService) {
    super("dropout", "Drops a team from the signup list");
    this.addStringInput("teamname", "Team name", {
      isRequired: true,
      minLength: 1,
      maxLength: 25,
    });
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
      await this.rosterService.removeSignup(
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
