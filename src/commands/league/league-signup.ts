import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { isGuildMember } from "../../utility/utility";
import { OverstatService } from "../../services/overstat";
import { User } from "discord.js";

// TODO which fields are optional
export class LeagueSignupCommand extends MemberCommand {
  inputNames = {
    teamName: "team-name",
    compExperience: "comp-experience",
    daysUnableToPlay: "days-unable-to-play",

    player1inputNames: {
      user: "player1",
      rank: "player1-rank",
      lastSeasonDivision: "player1-vesa-division",
      overstatLink: "player1-overstat-link",
    },

    player2inputNames: {
      user: "player2",
      rank: "player2-rank",
      lastSeasonDivision: "player2-vesa-division",
      overstatLink: "player2-overstat-link",
    },

    player3inputNames: {
      user: "player3",
      rank: "player3-rank",
      lastSeasonDivision: "player3-vesa-division",
      overstatLink: "player3-overstat-link",
    },
  };

  constructor(private overstatService: OverstatService) {
    super("league-signup", "Signup for the league");
    this.addStringInput(this.inputNames.teamName, "Team name", {
      isRequired: true,
      minLength: 1,
      maxLength: 25,
    });
    // TODO add choices https://docs.discordnet.dev/guides/int_basics/application-commands/slash-commands/choice-slash-command.html
    this.addIntegerInput(
      this.inputNames.compExperience,
      "Your teams comp experience: 1 for none, 5 for extremely experienced",
      {
        isRequired: true,
        minValue: 1,
        maxValue: 5,
      },
    );

    this.addUserInput(this.inputNames.player1inputNames.user, "@player1", true);
    this.addUserInput(this.inputNames.player2inputNames.user, "@player2", true);
    this.addUserInput(this.inputNames.player3inputNames.user, "@player3", true);

    // TODO choice
    this.addIntegerInput(
      this.inputNames.player1inputNames.rank,
      "Player 1 last seasons peak rank",
      {
        isRequired: true,
      },
    );
    this.addIntegerInput(
      this.inputNames.player2inputNames.rank,
      "Player 2 last seasons peak rank",
      {
        isRequired: true,
      },
    );
    this.addIntegerInput(
      this.inputNames.player3inputNames.rank,
      "Player 3 last seasons peak rank",
      {
        isRequired: true,
      },
    );

    this.addStringInput(
      this.inputNames.daysUnableToPlay,
      "Days your team is unable to play due to scheduling conflicts for one or more of your players",
    );

    // TODO choice
    this.addIntegerInput(
      this.inputNames.player1inputNames.lastSeasonDivision,
      "Player 1 last vesa seasons division",
    );
    this.addIntegerInput(
      this.inputNames.player2inputNames.lastSeasonDivision,
      "Player 2 last vesa seasons division",
    );
    this.addIntegerInput(
      this.inputNames.player3inputNames.lastSeasonDivision,
      "Player 3 last vesa seasons division",
    );

    this.addStringInput(
      this.inputNames.player1inputNames.overstatLink,
      "Player 1 overstat link",
    );
    this.addStringInput(
      this.inputNames.player2inputNames.overstatLink,
      "Player 2 overstat link",
    );
    this.addStringInput(
      this.inputNames.player3inputNames.overstatLink,
      "Player 3 overstat link",
    );
  }

  async run(interaction: CustomInteraction) {
    const channelId = interaction.channelId;
    const teamName = interaction.options.getString(
      this.inputNames.teamName,
      true,
    );
    const compExperience = interaction.options.getInteger(
      this.inputNames.compExperience,
      true,
    );
    const signupPlayer = interaction.member;
    const player1 = this.getPlayerInputs(
      this.inputNames.player1inputNames,
      interaction,
    );
    const player2 = this.getPlayerInputs(
      this.inputNames.player2inputNames,
      interaction,
    );
    const player3 = this.getPlayerInputs(
      this.inputNames.player3inputNames,
      interaction,
    );

    if (!isGuildMember(signupPlayer)) {
      await interaction.reply(
        "Team not signed up. Signup initiated by member that cannot be found. Contact admin",
      );
      return;
    }
    // TODO maybe check for overstat links here and error out. Ask the user to provide an override input? eg: override-missing-info

    await interaction.deferReply();
    // TODO actuall implementation
    console.log(channelId, teamName, compExperience, player1, player2, player3);
    await interaction.followUp("Waited some time, replying now");
  }

  // TODO convert integer inputs to enums
  // TODO which ones should be optional?
  getPlayerInputs(
    playerNumberInputs: {
      user: string;
      rank: string;
      overstatLink: string;
      lastSeasonDivision: string;
    },
    interaction: CustomInteraction,
  ): {
    user: User;
    rank: number;
    overstatLink: string | null;
    lastSeasonDivision: number;
  } {
    return {
      user: interaction.options.getUser(playerNumberInputs.user, true),
      rank: interaction.options.getInteger(playerNumberInputs.rank, true),
      overstatLink: interaction.options.getString(
        playerNumberInputs.overstatLink,
      ),
      lastSeasonDivision: interaction.options.getInteger(
        playerNumberInputs.lastSeasonDivision,
        true,
      ),
    };
  }
}
