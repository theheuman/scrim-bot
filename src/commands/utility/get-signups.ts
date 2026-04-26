import { CustomInteraction } from "../interaction";
import { StaticValueService } from "../../services/static-values";
import { ScrimSignup } from "../../models/Scrims";
import { SignupService } from "../../services/signups";

export class GetSignupsHelper {
  static async getSignupsForChannel(
    signupsService: SignupService,
    staticValueService: StaticValueService,
    interaction: CustomInteraction,
  ): Promise<{ mainList: ScrimSignup[]; waitList: ScrimSignup[] } | undefined> {
    const scrimPassMemberIds: string[] =
      await GetSignupsHelper.getScrimPassMemberIds(
        staticValueService,
        interaction,
      );
    const channelId = interaction.channelId;

    let channelSignups: { mainList: ScrimSignup[]; waitList: ScrimSignup[] };
    try {
      channelSignups = await signupsService.getSignups(
        channelId,
        scrimPassMemberIds,
      );
    } catch (e) {
      await interaction.editReply(`Could not fetch signups. ${e}`);
      return undefined;
    }
    return channelSignups;
  }

  static async getScrimPassMemberIds(
    staticValueService: StaticValueService,
    interaction: CustomInteraction,
  ): Promise<string[]> {
    const scrimPassRoleId = await staticValueService.getScrimPassRoleId();
    let scrimPassMemberIds: string[] = [];
    if (scrimPassRoleId) {
      const scrimPassRole = await interaction.guild?.roles.fetch(
        scrimPassRoleId,
        {
          cache: true,
          force: true,
        },
      );
      if (scrimPassRole) {
        scrimPassMemberIds = [...scrimPassRole.members].map(
          (collectionItem) => collectionItem[0],
        );
      } else {
        console.error(
          "Can't fetch scrim pass role members from discord for: guild, role id",
          interaction.guild,
          scrimPassRoleId,
        );
        await interaction.editReply(
          "Can't fetch scrim pass role members from discord",
        );
      }
    } else {
      console.error("Unable to get scrim pass role id from db");
      await interaction.editReply("Unable to get scrim pass role id from db");
    }
    return scrimPassMemberIds;
  }
}
