import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { isGuildMember } from "../../utility/utility";
import { Player } from "../../models/Player";
import { OverstatService } from "../../services/overstat";

export class LeagueSignupCommand extends MemberCommand {
  teamNameInputName = "team-name";
  compExperienceInputName = "comp-experience";
  player1InputName = "player1";
  player2InputName = "player2";
  player3InputName = "player3";

  constructor(private overstatService: OverstatService) {
    super("league-signup", "Signup for the league");
    this.addStringInput(this.teamNameInputName, "Team name", {
      isRequired: true,
      minLength: 1,
      maxLength: 25,
    });
    this.addIntegerInput(
      this.compExperienceInputName,
      "Your teams comp experience: 1 for none, 5 for extremely experienced",
      {
        isRequired: true,
        minValue: 1,
        maxValue: 5,
      },
    );

    this.addUserInput(this.player1InputName, "@player1", true);
    this.addUserInput(this.player2InputName, "@player2", true);
    this.addUserInput(this.player3InputName, "@player3", true);
  }

  async run(interaction: CustomInteraction) {
    const channelId = interaction.channelId;
    const teamName = interaction.options.getString(
      this.teamNameInputName,
      true,
    );
    const compExperience = interaction.options.getInteger(
      this.compExperienceInputName,
      true,
    );
    const signupPlayer = interaction.member;
    const player1 = interaction.options.getUser(this.player1InputName, true);
    const player2 = interaction.options.getUser(this.player2InputName, true);
    const player3 = interaction.options.getUser(this.player3InputName, true);

    if (!isGuildMember(signupPlayer)) {
      await interaction.reply(
        "Team not signed up. Signup initiated by member that cannot be found. Contact admin",
      );
      return;
    }
    await interaction.ogInteraction.deferReply();
    // do the logic!
  }
}
