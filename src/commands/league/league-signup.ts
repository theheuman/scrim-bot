import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { isGuildMember } from "../../utility/utility";
import { Player } from "../../models/Player";
import { OverstatService } from "../../services/overstat";
import { User } from "discord.js";

// TODO which fields are optional
export class LeagueSignupCommand extends MemberCommand {
  inputNames = {
    teamName: "team-name",
    compExperience: "comp-experience",
    daysUnableToPlay: "days-unable-to-play",

    player1: {
      user: "player1",
      rank: "player1-rank",
      lastSeasonDivision: "player1-last-season-vesa-division",
      overstatLink: "player1-overstat-link",
    },

    player2: {
      user: "player2",
      rank: "player2-rank",
      lastSeasonDivision: "player2-last-season-vesa-division",
      overstatLink: "player2-overstat-link",
    },

    player3: {
      user: "player3",
      rank: "player3-rank",
      lastSeasonDivision: "player3-last-season-vesa-division",
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

    this.addStringInput(
      this.inputNames.daysUnableToPlay,
      "Days your team is unable to play, ex: Monday, Tuesday, Wednesday, Thursday, Friday. Input as a comma delimited list of days your team can not play because one or more of you have other engagements",
    );

    this.addUserInput(this.inputNames.player1.user, "@player1", true);
    this.addUserInput(this.inputNames.player2.user, "@player2", true);
    this.addUserInput(this.inputNames.player3.user, "@player3", true);

    this.addStringInput(
      this.inputNames.player1.overstatLink,
      "Player 1 overstat link",
    );
    this.addStringInput(
      this.inputNames.player2.overstatLink,
      "Player 2 overstat link",
    );
    this.addStringInput(
      this.inputNames.player3.overstatLink,
      "Player 3 overstat link",
    );

    // TODO choice
    this.addStringInput(
      this.inputNames.player1.rank,
      "Player 1 last seasons peak rank",
    );
    this.addStringInput(
      this.inputNames.player2.rank,
      "Player 2 last seasons peak rank",
    );
    this.addStringInput(
      this.inputNames.player3.rank,
      "Player 3 last seasons peak rank",
    );

    // TODO choice
    this.addUserInput(
      this.inputNames.player1.lastSeasonDivision,
      "Player 1 last vesa seasons division",
      true,
    );
    this.addUserInput(
      this.inputNames.player2.lastSeasonDivision,
      "Player 2 last vesa seasons division",
      true,
    );
    this.addUserInput(
      this.inputNames.player3.lastSeasonDivision,
      "Player 3 last vesa seasons division",
      true,
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
    const player1 = this.getPlayerInputs(this.inputNames.player1, interaction);
    const player2 = this.getPlayerInputs(this.inputNames.player2, interaction);
    const player3 = this.getPlayerInputs(this.inputNames.player3, interaction);

    if (!isGuildMember(signupPlayer)) {
      await interaction.reply(
        "Team not signed up. Signup initiated by member that cannot be found. Contact admin",
      );
      return;
    }
    await interaction.ogInteraction.deferReply();
    // do the logic!
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
    overstatLink: string;
    lastSeasonDivision: number;
  } {
    return {
      user: interaction.options.getUser(playerNumberInputs.user, true),
      rank: interaction.options.getInteger(playerNumberInputs.rank, true),
      overstatLink: interaction.options.getString(
        playerNumberInputs.overstatLink,
        true,
      ),
      lastSeasonDivision: interaction.options.getInteger(
        playerNumberInputs.lastSeasonDivision,
        true,
      ),
    };
  }
}
