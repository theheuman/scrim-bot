import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { isGuildMember } from "../../utility/utility";
import { OverstatService } from "../../services/overstat";
import { LeagueService, SheetsPlayer } from "../../services/league";
import { PlayerRank, Platform, VesaDivision } from "../../models/league-models";
import { LeagueCommandHelper } from "./league-command-helper";

export class LeagueSignupCommand extends MemberCommand {
  inputNames = {
    teamName: "team-name",
    compExperience: "comp-experience",
    daysUnableToPlay: "days-unable-to-play",

    player1inputNames: {
      user: "player1",
      rank: "player1-rank",
      lastSeasonDivision: "player1-previous-vesa-division",
      overstatLink: "player1-overstat-link",
      platform: "player1-platform",
    },

    player2inputNames: {
      user: "player2",
      rank: "player2-rank",
      lastSeasonDivision: "player2-previous-vesa-division",
      overstatLink: "player2-overstat-link",
      platform: "player2-platform",
    },

    player3inputNames: {
      user: "player3",
      rank: "player3-rank",
      lastSeasonDivision: "player3-previous-vesa-division",
      overstatLink: "player3-overstat-link",
      platform: "player3-platform",
    },
    comments: "additional-comments",
  };

  constructor(
    private overstatService: OverstatService,
    private leagueService: LeagueService,
  ) {
    super("league-signup", "Signup for the league");
    this.addStringInput(this.inputNames.teamName, "Team name", {
      isRequired: true,
      minLength: 1,
      maxLength: 25,
    });

    this.addStringInput(
      this.inputNames.compExperience,
      `State scrim frequency/experience & main servers for your team? Ex: "~2 days per wk, for 2 yrs, EEC"`,
      { isRequired: true },
    );

    this.addUserInput(
      this.inputNames.player1inputNames.user,
      "@player1 (Captain)",
      true,
    );
    this.addUserInput(this.inputNames.player2inputNames.user, "@player2", true);
    this.addUserInput(this.inputNames.player3inputNames.user, "@player3", true);

    this.addChoiceInput(
      this.inputNames.player1inputNames.rank,
      "Player 1 last apex seasons peak rank",
      PlayerRank,
      true,
    );
    this.addChoiceInput(
      this.inputNames.player2inputNames.rank,
      "Player 2 last apex seasons peak rank",
      PlayerRank,
      true,
    );
    this.addChoiceInput(
      this.inputNames.player3inputNames.rank,
      "Player 3 last apex seasons peak rank",
      PlayerRank,
      true,
    );

    this.addChoiceInput(
      this.inputNames.player1inputNames.platform,
      "Player 1 platform",
      Platform,
      true,
    );
    this.addChoiceInput(
      this.inputNames.player2inputNames.platform,
      "Player 2 platform",
      Platform,
      true,
    );
    this.addChoiceInput(
      this.inputNames.player3inputNames.platform,
      "Player 3 platform",
      Platform,
      true,
    );

    this.addStringInput(
      this.inputNames.player1inputNames.overstatLink,
      `Player 1 overstat link. Write "None" if they do not have one`,
      {
        isRequired: true,
      },
    );
    this.addStringInput(
      this.inputNames.player2inputNames.overstatLink,
      `Player 2 overstat link. Write "None" if they do not have one`,
      {
        isRequired: true,
      },
    );
    this.addStringInput(
      this.inputNames.player3inputNames.overstatLink,
      `Player 3 overstat link. Write "None" if they do not have one`,
      {
        isRequired: true,
      },
    );

    this.addChoiceInput(
      this.inputNames.player1inputNames.lastSeasonDivision,
      "Player 1 most recent VESA season division",
      VesaDivision,
      true,
    );
    this.addChoiceInput(
      this.inputNames.player2inputNames.lastSeasonDivision,
      "Player 2 most recent VESA season division",
      VesaDivision,
      true,
    );
    this.addChoiceInput(
      this.inputNames.player3inputNames.lastSeasonDivision,
      "Player 3 most recent VESA season division",
      VesaDivision,
      true,
    );

    this.addStringInput(
      this.inputNames.daysUnableToPlay,
      "Days your team is unable to play due to scheduling conflicts for one or more of your players",
    );

    this.addStringInput(
      this.inputNames.comments,
      "Anything else you'd like to add that could help us sort or prioritize your team",
    );
  }

  async run(interaction: CustomInteraction) {
    const teamName = interaction.options.getString(
      this.inputNames.teamName,
      true,
    );
    const teamNoDays = interaction.options.getString(
      this.inputNames.daysUnableToPlay,
    );
    const compExperience = interaction.options.getString(
      this.inputNames.compExperience,
      true,
    );
    const additionalComments = interaction.options.getString(
      this.inputNames.comments,
    );
    const signupPlayer = interaction.member;
    let player1: SheetsPlayer;
    let player2: SheetsPlayer;
    let player3: SheetsPlayer;

    try {
      player1 = await this.getPlayerInputs(
        this.inputNames.player1inputNames,
        interaction,
      );
      player2 = await this.getPlayerInputs(
        this.inputNames.player2inputNames,
        interaction,
      );
      player3 = await this.getPlayerInputs(
        this.inputNames.player3inputNames,
        interaction,
      );
      if (
        ![player1.discordId, player2.discordId, player3.discordId].includes(
          interaction.member.id,
        )
      ) {
        await interaction.invisibleReply(
          `Team not signed up. User signing team up must be a player on the team`,
        );
        return;
      }
    } catch (e) {
      await interaction.invisibleReply(
        `Team not signed up. One or more of the overstat links provided are not valid. Write "None" if the player does not have one.\n` +
          e,
      );
      return;
    }

    if (!isGuildMember(signupPlayer)) {
      await interaction.invisibleReply(
        "Team not signed up. Signup initiated by member that cannot be found. Contact admin",
      );
      return;
    }

    // TODO add in logic to followup with user asking for overstat id if none provided

    await interaction.deferReply();

    try {
      const signupResult = await this.leagueService.signup(
        teamName,
        teamNoDays ?? "Open schedule",
        compExperience,
        player1,
        player2,
        player3,
        additionalComments ?? "",
      );
      if (!signupResult) {
        await interaction.followUp(
          "Problem parsing google sheets response, please check sheet to see if your signup went through before resubmitting",
        );
        return;
      }
      const signupString = this.formatTeam({
        teamName,
        players: [player1, player2, player3],
        signupPlayer: {
          discordId: signupPlayer.id,
        },
      });

      let additionalInfo = "";
      const currentDate = new Date();
      if (new Date(signupResult.seasonInfo.startDate) < currentDate) {
        additionalInfo =
          "\nThe season is already ongoing, the team will be placed on the waitlist to fill in for teams that drop out.";
      } else if (
        new Date(signupResult.seasonInfo.signupPrioEndDate) < currentDate
      ) {
        additionalInfo = "\nSignup occurred after the priority window ended.";
      }

      await interaction.followUp(
        `${signupString}\nSignup #${signupResult.rowNumber}. Your priority based on returning players will be determined by admins manually${additionalInfo}`,
      );
    } catch (e) {
      await interaction.followUp(`Team not signed up. ${e}`);
    }
  }

  async getPlayerInputs(
    playerNumberInputs: {
      user: string;
      rank: string;
      overstatLink: string;
      lastSeasonDivision: string;
      platform: string;
    },
    interaction: CustomInteraction,
  ): Promise<SheetsPlayer> {
    const user = interaction.options.getUser(playerNumberInputs.user, true);
    const overstatLink = await LeagueCommandHelper.VALIDATE_OVERSTAT_LINK(
      user,
      interaction.options.getString(playerNumberInputs.overstatLink, true),
      this.overstatService,
    );
    return {
      elo: undefined,
      platform: interaction.options.getChoice(
        playerNumberInputs.platform,
        Platform,
        true,
      ),
      name: user.displayName,
      discordId: user.id,
      rank: interaction.options.getChoice(
        playerNumberInputs.rank,
        PlayerRank,
        true,
      ),
      overstatLink,
      previous_season_vesa_division: interaction.options.getChoice(
        playerNumberInputs.lastSeasonDivision,
        VesaDivision,
        true,
      ),
    };
  }
}
