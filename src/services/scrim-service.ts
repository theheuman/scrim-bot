import { DB } from "../db/db";
import { OverstatService } from "./overstat";
import { HuggingFaceService } from "./hugging-face";
import { Scrim } from "../models/Scrims";
import { SignupService } from "./signups";

export class ScrimService {
  constructor(
    private db: DB,
    private overstatService: OverstatService,
    private huggingFaceService: HuggingFaceService,
    private signupService: SignupService,
  ) { }

  async createScrim(discordChannelID: string, dateTime: Date): Promise<string> {
    const scrimId = await this.db.createNewScrim(dateTime, discordChannelID);
    const scrim: Scrim = {
      active: true,
      dateTime: dateTime,
      discordChannel: discordChannelID,
      id: scrimId,
    };
    return scrimId;
  }

  async getScrim(discordChannel: string): Promise<Scrim | null> {
    const activeScrims = await this.db.getActiveScrims();
    const dbScrim = activeScrims.find((scrim) => scrim.discord_channel === discordChannel)
    if (dbScrim && dbScrim.id && dbScrim.discord_channel) {
      const mappedScrim: Scrim = {
        active: true,
        dateTime: new Date(dbScrim.date_time_field),
        discordChannel: dbScrim.discord_channel,
        id: dbScrim.id,
      };
      return mappedScrim;
    }
    else {
      return null;
    }
  }

  async computeScrim(discordChannelID: string, overstatLinks: string[]) {
    const scrims = await this.db.getScrimsByDiscordChannel(discordChannelID);
    if (!scrims.length) {
      throw Error("No scrim found for that channel");
    }
    const overstatIds = overstatLinks.map((link) =>
      this.overstatService.getTournamentId(link),
    );
    const scrimsWithoutOverstatId = scrims.filter((scrim) => !scrim.overstatId);
    const scrimsToRecompute = scrims.filter((scrim) =>
      overstatIds.includes(scrim.overstatId ?? ""),
    );

    const unlinkedOverstatIds = overstatIds.filter(
      (id) => !scrims.some((scrim) => scrim.overstatId === id),
    );

    await this.computeAlreadyCreatedScrims(
      [...scrimsWithoutOverstatId, ...scrimsToRecompute],
      unlinkedOverstatIds,
    );

    const newOverstatIds = unlinkedOverstatIds.slice(
      scrimsWithoutOverstatId.length,
    );
    await this.computeNewScrims(newOverstatIds, {
      scrimDateTime: scrims[0].dateTime,
      discordChannelID,
    });

    return overstatLinks;
  }

  private async computeAlreadyCreatedScrims(
    scrims: Scrim[],
    unlinkedOverstatIds: string[],
  ) {
    let nextIdIndex = 0;
    for (const scrim of scrims) {
      let overstatId = scrim.overstatId;
      if (!overstatId) {
        overstatId = unlinkedOverstatIds[nextIdIndex];
        nextIdIndex++;
      }
      if (!overstatId) {
        throw new Error(
          "Mismatch in scrims to overstat ids, code error, this shouldn't be possible",
        );
      }
      const stats = await this.overstatService.getOverallStatsForId(overstatId);
      await this.db.updateScrim(scrim.id, {
        overstatId: overstatId,
        overstatJson: stats,
      });
      try {
        await this.huggingFaceService.uploadOverstatJson(
          overstatId,
          scrim.dateTime,
          stats,
        );
      } catch (e) {
        // TODO use currently unimplemented discord service error message to send error in a relevant channel
        console.error(e);
      }
    }
  }

  private async computeNewScrims(
    newOverstatIds: string[],
    scrimInfo: { discordChannelID: string; scrimDateTime: Date },
  ) {
    const errors: string[] = [];
    for (const overstatId of newOverstatIds) {
      const stats = await this.overstatService.getOverallStatsForId(overstatId);
      await this.db.createNewScrim(
        scrimInfo.scrimDateTime,
        scrimInfo.discordChannelID,
        overstatId,
        stats,
      );
      try {
        await this.huggingFaceService.uploadOverstatJson(
          overstatId,
          scrimInfo.scrimDateTime,
          stats,
        );
      } catch (e) {
        errors.push(`${overstatId}: ${e}`);
      }
    }
    if (errors.length > 0) {
      // TODO use currently unimplemented discord service error message to send error in a relevant channel
      console.error(errors);
    }
  }

  async closeScrim(discordChannelID: string) {
    const scrimId = (await this.getScrim(discordChannelID))?.id;
    if (!scrimId) {
      throw Error("No scrim found for that channel");
    }
    await this.db.closeScrim(discordChannelID);
  }
}
