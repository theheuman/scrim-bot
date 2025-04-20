import { MemberCommand } from "../command";
import { CustomInteraction } from "../interaction";
import { ScrimSignups } from "../../services/signups";
import { StaticValueService } from "../../services/static-values";
import { ScrimSignup } from "../../models/Scrims";
import { GetSignupsHelper } from "../utility/get-signups";

export class CurrentPositionCommand extends MemberCommand {
  constructor(
    private signupService: ScrimSignups,
    private staticValueService: StaticValueService,
  ) {
    super(
      "current-position",
      "Returns your teams priority position for the scrim",
    );
  }

  async run(interaction: CustomInteraction) {
    await interaction.invisibleReply(
      "Fetching scrim information, command in progress",
    );

    const channelSignups = await GetSignupsHelper.getSignupsForChannel(
      this.signupService,
      this.staticValueService,
      interaction,
    );
    if (!channelSignups) {
      // reply is handled in GetSignupsHelper
      return;
    }

    const { mainList, waitList } = channelSignups;
    const list: ScrimSignup[] = [...mainList, ...waitList];

    const teamsWithPrio = {
      positive: 0,
      negative: 0,
    };
    const replyArray = [];
    let index = 0;
    for (const signup of list) {
      index++;
      const isSignupUser =
        signup.signupPlayer.discordId === interaction.member.id;
      const isPlayer = signup.players.find(
        (player) => player.discordId === interaction.member.id,
      );
      if (isSignupUser || isPlayer) {
        replyArray.push(
          `__${signup.teamName}__ at position: ${index}. Prio: ${signup.prio?.amount ?? 0}. ${signup.prio?.reasons ?? ""}`,
        );
      } else if ((signup.prio?.amount ?? 0) < 0) {
        teamsWithPrio.negative++;
      } else if ((signup.prio?.amount ?? 0) > 0) {
        teamsWithPrio.positive++;
      }
    }

    if (replyArray.length === 0) {
      await interaction.editReply("Member not found on any team in this scrim");
    } else {
      const positiveIsPlural = teamsWithPrio.positive !== 1;
      const negativeIsPlural = teamsWithPrio.negative !== 1;
      const positiveMessage = `There ${positiveIsPlural ? "are" : "is"} ${teamsWithPrio.positive} team${positiveIsPlural ? "s" : ""} in this scrim with positive prio`;
      const negativeMessage = `There ${positiveIsPlural ? "are" : "is"} ${teamsWithPrio.negative} team${negativeIsPlural ? "s" : ""} in this scrim with negative prio`;
      replyArray.push(positiveMessage);
      replyArray.push(negativeMessage);
      const message = replyArray.join("\n");
      await interaction.editReply(message);
    }
  }
}
