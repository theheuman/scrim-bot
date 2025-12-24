import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { isGuildMember } from "../../utility/utility";
import { OverstatService } from "../../services/overstat";
import { Snowflake } from "discord.js";
import { GoogleAuth, OAuth2Client } from "googleapis-common";
import { AnyAuthClient } from "google-auth-library";
import { auth, sheets } from "@googleapis/sheets";
import { SheetHelper, SpreadSheetType } from "../../utility/sheet-helper";

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
      platform: "player1-platform",
    },

    player2inputNames: {
      user: "player2",
      rank: "player2-rank",
      lastSeasonDivision: "player2-vesa-division",
      overstatLink: "player2-overstat-link",
      platform: "player2-platform",
    },

    player3inputNames: {
      user: "player3",
      rank: "player3-rank",
      lastSeasonDivision: "player3-vesa-division",
      overstatLink: "player3-overstat-link",
      platform: "player3-platform",
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

    // TODO choice
    this.addIntegerInput(
      this.inputNames.player1inputNames.platform,
      "Player 1 platform",
      {
        isRequired: true,
      },
    );
    this.addIntegerInput(
      this.inputNames.player2inputNames.platform,
      "Player 2 platform",
      {
        isRequired: true,
      },
    );
    this.addIntegerInput(
      this.inputNames.player3inputNames.platform,
      "Player 3 platform",
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
    // const channelId = interaction.channelId;
    const teamName = interaction.options.getString(
      this.inputNames.teamName,
      true,
    );
    const teamNoDays = interaction.options.getString(
      this.inputNames.daysUnableToPlay,
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

    try {
      const signupNumber = await this.postSpreadSheetValue(
        teamName,
        teamNoDays,
        compExperience as CompKnowledge,
        player1,
        player2,
        player3,
      );
      if (!signupNumber) {
        await interaction.followUp(
          "Problem parsing google sheets response, please check sheet to see if your signup went through before resubmitting",
        );
        return;
      }
      const signupString = this.formatTeam({
        teamName,
        players: [player1, player2, player3],
        signupPlayer: player1,
      });
      await interaction.followUp(
        `${signupString}\nSignup #${signupNumber}. Your priority based on returning players will be determined by admins manually`,
      );
    } catch (e) {
      await interaction.followUp(`Team not signed up. ${e}`);
    }
  }

  // TODO convert integer inputs to enums
  // TODO which ones should be optional?
  getPlayerInputs(
    playerNumberInputs: {
      user: string;
      rank: string;
      overstatLink: string;
      lastSeasonDivision: string;
      platform: string;
    },
    interaction: CustomInteraction,
  ): SheetsPlayer {
    const user = interaction.options.getUser(playerNumberInputs.user, true);
    return {
      elo: undefined,
      platform: interaction.options.getInteger(
        playerNumberInputs.platform,
        true,
      ),
      name: user.displayName,
      discordId: user.id,
      rank: interaction.options.getInteger(playerNumberInputs.rank, true),
      overstatLink:
        interaction.options.getString(playerNumberInputs.overstatLink) ??
        undefined,
      previous_season_vesa_division: interaction.options.getInteger(
        playerNumberInputs.lastSeasonDivision,
        true,
      ),
    };
  }

  async postSpreadSheetValue(
    teamName: string,
    teamNoDays: string,
    teamCompKnowledge: CompKnowledge,
    player1: SheetsPlayer,
    player2: SheetsPlayer,
    player3: SheetsPlayer,
  ): Promise<number | null> {
    const authClient = await this.getAuthClient();

    const values = [
      [
        teamName,
        teamNoDays,
        teamCompKnowledge,
        ...this.convertSheetsPlayer(player1),
        ...this.convertSheetsPlayer(player2),
        ...this.convertSheetsPlayer(player3),
      ],
    ];

    console.log(values);

    const request = SheetHelper.BUILD_REQUEST(
      values,
      authClient as OAuth2Client,
      SpreadSheetType.TEST_SHEET,
    );

    const sheetsClient = sheets({ version: "v4" });
    const response = await sheetsClient.spreadsheets.values.append(request);
    console.log(response.data);
    const rowNumber = SheetHelper.GET_ROW_NUMBER_FROM_UPDATE_RESPONSE(
      response.data.updates,
    );
    return rowNumber ? rowNumber - SheetHelper.STARTING_CELL_OFFSET : null;
  }

  private convertSheetsPlayer(player: SheetsPlayer): (string | number)[] {
    return [
      player.name,
      player.discordId,
      player.overstatLink ?? "No overstat",
      player.previous_season_vesa_division,
      player.rank,
      player.platform,
      player.elo ?? "No elo on record",
    ];
  }

  getAuthClient(): Promise<AnyAuthClient> {
    const googleAuth = new auth.GoogleAuth({
      keyFile: "service-account-key.json",
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    }) as GoogleAuth;

    return googleAuth.getClient();
  }
}

enum PlayerRank {
  Bronze,
  Silver,
  Gold,
  Plat,
  LowDiamond,
  HighDiamond,
  Masters,
  Pred,
}

enum VesaDivision {
  Division10,
  Division9,
  Division8,
  Division7,
  Division6,
  Division5,
  Division4,
  Division3,
  Division2,
  Division1,
}

enum Platform {
  xbox,
  playstation,
  pc,
}

enum CompKnowledge {
  None,
  Some,
  Fair,
  Alot,
  Pro,
}

interface SheetsPlayer {
  name: string;
  discordId: Snowflake;
  elo: number | undefined;
  rank: PlayerRank;
  previous_season_vesa_division: VesaDivision;
  platform: Platform;
  overstatLink: string | undefined;
}
