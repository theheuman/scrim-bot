import { MemberCommand } from "../../command";
import { CustomInteraction } from "../../interaction";
import { RosterService } from "../../../services/rosters";
import { AlertService } from "../../../services/alert";
import { StaticValueService } from "../../../services/static-values";
import { isGuildMember } from "../../../utility/utility";

export class SubPlayerCommand extends MemberCommand {
  inputNames = {
    teamName: "team-name",
    removePlayer: "remove-player",
    addPlayer: "add-player",
  };
  constructor(
    alertService: AlertService,
    private rosterService: RosterService,
    private staticValueService: StaticValueService,
  ) {
    super(alertService, "sub-player", "Replace a player on a team");
    this.addStringInput(this.inputNames.teamName, "team name", {
      isRequired: true,
    });
    this.addUserInput(this.inputNames.removePlayer, "Player to remove", true);
    this.addUserInput(this.inputNames.addPlayer, "Player to add", true);
  }

  async run(interaction: CustomInteraction) {
    if (!isGuildMember(interaction.member)) {
      interaction.invisibleReply(
        "Sub not made. Member using the command not found",
      );
      return;
    }

    const teamName = interaction.options.getString(
      this.inputNames.teamName,
      true,
    );
    const playerToRemove = interaction.options.getUser(
      this.inputNames.removePlayer,
      true,
    );
    const playerToAdd = interaction.options.getUser(
      this.inputNames.addPlayer,
      true,
    );
    await interaction.reply("Fetched all input and working on your request!");

    try {
      const team = await this.rosterService.replaceTeammate(
        interaction.member,
        interaction.channelId,
        teamName,
        playerToRemove,
        playerToAdd,
      );
      await interaction.editReply(
        `Sub made. <@${playerToRemove.id}> replaced by <@${playerToAdd.id}>.\n` +
          `__${teamName}__ new roster: ${team.players.map((player) => this.formatPlayer(player)).join(", ")}`,
      );
      const newPlayer = team.players.find(
        (p) => p.discordId === playerToAdd.id,
      );
      if (newPlayer && !newPlayer.overstatId) {
        await this.warnMissingOverstat(newPlayer.displayName, interaction);
      }
    } catch (error) {
      await interaction.editReply("Sub not made. " + error);
    }
  }

  private async warnMissingOverstat(
    displayName: string,
    interaction: CustomInteraction,
  ) {
    const requireOverstat =
      await this.staticValueService.requireOverstatForSignup();
    const content = requireOverstat
      ? `Your admin role overrode missing overstat for: ${displayName}`
      : `The following players have not linked their Overstat: ${displayName}. To accurately sort your team in the future, please let them know to link their Overstat by following the pinned instructions in https://discord.com/channels/1043350338574495764/1341877592139104376`;
    await interaction.followUp({ content, ephemeral: true });
  }
}
