import { MemberCommand } from "../../command";
import { CustomInteraction } from "../../interaction";
import { SignupService } from "../../../services/signups";
import { StaticValueService } from "../../../services/static-values";
import { ScrimType, ScrimSignup } from "../../../models/Scrims";
import { GetSignupsHelper } from "../../utility/get-signups";
import { ScrimService } from "../../../services/scrim-service";
import { AlertService } from "../../../services/alert";

export class CurrentPositionCommand extends MemberCommand {
  constructor(
    alertService: AlertService,
    private signupService: SignupService,
    private staticValueService: StaticValueService,
    private scrimService: ScrimService,
  ) {
    super(
      alertService,
      "current-position",
      "Returns your teams priority position for the scrim",
    );
  }

  async run(interaction: CustomInteraction) {
    await interaction.deferReply();

    const channelSignups = await GetSignupsHelper.getSignupsForChannel(
      this.signupService,
      this.staticValueService,
      interaction,
    );
    if (!channelSignups) {
      // reply is handled in GetSignupsHelper
      return;
    }

    const scrim = await this.scrimService.getScrim(interaction.channelId);
    if (!scrim) {
      await this.alertService.warn(
        "Unable to get scrim for current position command, defaulting to regular prio type",
      );
    }
    const prioActive =
      (scrim?.scrimType ?? ScrimType.regular) !== ScrimType.tournament;

    const { mainList, waitList } = channelSignups;
    const list: ScrimSignup[] = [...mainList, ...waitList];

    const teamsWithPrio = {
      positive: 0,
      negative: 0,
    };
    const replyArray = [];
    let userTeamHasPrio = false;
    let index = 0;
    for (const signup of list) {
      index++;
      const isSignupUser =
        signup.signupPlayer.discordId === interaction.member.id;
      const isPlayer = signup.players.find(
        (player) => player.discordId === interaction.member.id,
      );
      if (isSignupUser || isPlayer) {
        const prioSuffix = prioActive
          ? `. Prio: ${signup.prio?.amount ?? 0}. ${signup.prio?.reasons ?? ""}`
          : "";
        replyArray.push(
          `__${signup.teamName}__ at position: ${index}${prioSuffix}`,
        );
        if (prioActive && (signup.prio?.amount ?? 0) !== 0) {
          userTeamHasPrio = true;
        }
      } else if (prioActive && scrim?.scrimType === ScrimType.regular) {
        if ((signup.prio?.amount ?? 0) < 0) {
          teamsWithPrio.negative++;
        } else if ((signup.prio?.amount ?? 0) > 0) {
          teamsWithPrio.positive++;
        }
      }
    }

    if (replyArray.length === 0) {
      await interaction.editReply("Member not found on any team in this scrim");
    } else {
      if (prioActive && scrim?.scrimType === ScrimType.regular) {
        const qualifier = userTeamHasPrio ? "other " : "";
        const positiveIsPlural = teamsWithPrio.positive !== 1;
        const negativeIsPlural = teamsWithPrio.negative !== 1;
        const positiveMessage = `There ${positiveIsPlural ? "are" : "is"} ${teamsWithPrio.positive} ${qualifier}team${positiveIsPlural ? "s" : ""} in this scrim with positive prio`;
        const negativeMessage = `There ${positiveIsPlural ? "are" : "is"} ${teamsWithPrio.negative} ${qualifier}team${negativeIsPlural ? "s" : ""} in this scrim with negative prio`;
        replyArray.push(positiveMessage);
        replyArray.push(negativeMessage);
      }
      const message = replyArray.join("\n");
      await interaction.editReply(message);
    }
  }
}
