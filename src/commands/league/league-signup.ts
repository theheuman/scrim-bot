import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { isGuildMember } from "../../utility/utility";
import { OverstatService } from "../../services/overstat";
import { Snowflake, User } from "discord.js";
import { GoogleAuth, OAuth2Client } from "googleapis-common";
import { AnyAuthClient } from "google-auth-library";
import { auth, sheets } from "@googleapis/sheets";
import { SheetHelper, SpreadSheetType } from "../../utility/sheet-helper";

export class LeagueSignupCommand extends MemberCommand {
  inputNames = {
    teamName: "team-name",
    compExperience: "comp-experience",
    daysUnableToPlay: "days-unable-to-play",

    player1inputNames: {
      user: "player1",
      rank: "player1-rank",
      lastSeasonDivision: "player1-s12-vesa-division",
      overstatLink: "player1-overstat-link",
      platform: "player1-platform",
    },

    player2inputNames: {
      user: "player2",
      rank: "player2-rank",
      lastSeasonDivision: "player2-s12-vesa-division",
      overstatLink: "player2-overstat-link",
      platform: "player2-platform",
    },

    player3inputNames: {
      user: "player3",
      rank: "player3-rank",
      lastSeasonDivision: "player3-s12-vesa-division",
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

    this.addChoiceInput(
      this.inputNames.compExperience,
      "Your teams comp experience",
      CompKnowledge,
      true,
    );

    this.addUserInput(this.inputNames.player1inputNames.user, "@player1", true);
    this.addUserInput(this.inputNames.player2inputNames.user, "@player2", true);
    this.addUserInput(this.inputNames.player3inputNames.user, "@player3", true);

    this.addChoiceInput(
      this.inputNames.player1inputNames.rank,
      "Player 1 last seasons peak rank",
      PlayerRank,
      true,
    );
    this.addChoiceInput(
      this.inputNames.player2inputNames.rank,
      "Player 2 last seasons peak rank",
      PlayerRank,
      true,
    );
    this.addChoiceInput(
      this.inputNames.player3inputNames.rank,
      "Player 3 last seasons peak rank",
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

    this.addStringInput(
      this.inputNames.daysUnableToPlay,
      "Days your team is unable to play due to scheduling conflicts for one or more of your players",
    );

    this.addChoiceInput(
      this.inputNames.player1inputNames.lastSeasonDivision,
      "Player 1 VESA season 12 division",
      VesaDivision,
    );
    this.addChoiceInput(
      this.inputNames.player2inputNames.lastSeasonDivision,
      "Player 2 VESA season 12 division",
      VesaDivision,
    );
    this.addChoiceInput(
      this.inputNames.player3inputNames.lastSeasonDivision,
      "Player 3 VESA season 12 division",
      VesaDivision,
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
    const compExperience = interaction.options.getChoice(
      this.inputNames.compExperience,
      CompKnowledge,
      true,
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
      const signupNumber = await this.postSpreadSheetValue(
        teamName,
        teamNoDays ?? "Open schedule",
        compExperience,
        player1,
        player2,
        player3,
      );
      if (signupNumber === null) {
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
    const overstatLink = await this.validateOverstatLink(
      user,
      interaction.options.getString(playerNumberInputs.overstatLink, true),
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
      previous_season_vesa_division:
        interaction.options.getChoice(
          playerNumberInputs.lastSeasonDivision,
          VesaDivision,
        ) ?? undefined,
    };
  }

  // throws if provided link is illegal or if provided link does not match link for that user in db, otherwise returns valid link, if "none" provided attempts to fetch from db. Sends undefined if it can't fetch it
  async validateOverstatLink(
    user: User,
    overstatLink: string,
  ): Promise<string | undefined> {
    let linkToReturn: string | undefined;
    if (overstatLink.toLowerCase() === "none") {
      try {
        linkToReturn = await this.overstatService.getPlayerOverstat(user);
      } catch {
        linkToReturn = undefined;
        console.log(
          "No overstat provided and none found in db for " + user.displayName,
        );
      }
    } else {
      // will throw an error if link is invalid
      await this.overstatService.validateLinkUrl(overstatLink);
      let dbOverstatLink;
      try {
        dbOverstatLink = await this.overstatService.getPlayerOverstat(user);
      } catch {
        await this.overstatService.addPlayerOverstatLink(user, overstatLink);
      }
      if (
        dbOverstatLink &&
        this.overstatService.getPlayerId(overstatLink) !==
          this.overstatService.getPlayerId(dbOverstatLink)
      ) {
        throw new Error(
          `Overstat provided for ${user.displayName} does not match link previously provided with /link-overstat command`,
        );
      }
      linkToReturn = overstatLink;
    }
    return linkToReturn;
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

    const compExperienceLabel = `${teamCompKnowledge}: ${CompKnowledge[teamCompKnowledge]}`;
    const returningPlayersCount = [player1, player2, player3].reduce(
      (count, player) => {
        if (player.previous_season_vesa_division !== undefined) {
          return count + 1;
        } else {
          return count;
        }
      },
      0,
    );
    const values = [
      [
        new Date().toISOString(),
        teamName,
        teamNoDays,
        compExperienceLabel,
        `${returningPlayersCount} returning players`,
        ...this.convertSheetsPlayer(player1),
        ...this.convertSheetsPlayer(player2),
        ...this.convertSheetsPlayer(player3),
      ],
    ];

    console.log(values);

    const request = SheetHelper.BUILD_REQUEST(
      values,
      authClient as OAuth2Client,
      SpreadSheetType.PROD_SHEET,
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
      player.previous_season_vesa_division !== undefined
        ? VesaDivision[player.previous_season_vesa_division]
        : "No division provided",
      PlayerRank[player.rank],
      Platform[player.platform],
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
  Division1,
  Division2,
  Division3,
  Division4,
  Division5,
  Division6,
  Division7,
  // Division8,
  // Division9,
  // Division10,
}

enum Platform {
  pc,
  playstation,
  xbox,
  switch,
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
  previous_season_vesa_division?: VesaDivision;
  platform: Platform;
  overstatLink: string | undefined;
}
