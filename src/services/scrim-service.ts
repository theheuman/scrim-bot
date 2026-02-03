import { DB } from "../db/db";
import { CacheService } from "./cache";
import { OverstatService } from "./overstat";
import { HuggingFaceService } from "./hugging-face";
import { Scrim } from "../models/Scrims";
import { SignupService } from "./signups";

export class ScrimService {
  constructor(
    private db: DB,
    private cache: CacheService,
    private overstatService: OverstatService,
    private huggingFaceService: HuggingFaceService,
    private signupService: SignupService,
  ) {
    this.updateActiveScrims();
  }

  async updateActiveScrims(log?: boolean) {
    const activeScrims = await this.db.getActiveScrims();
    for (const scrim of activeScrims) {
      if (scrim.id && scrim.discord_channel) {
        const mappedScrim: Scrim = {
          active: true,
          dateTime: new Date(scrim.date_time_field),
          discordChannel: scrim.discord_channel,
          id: scrim.id,
        };
        this.cache.createScrim(scrim.discord_channel, mappedScrim);
        if (log) {
          console.log("Added scrim channel", this.cache);
        }
        // This was calling this.getSignups(scrim.discord_channel) in original code
        // We need to decide if ScrimService should call SignupService or if that logic belongs elsewhere.
        // The original code was: this.getSignups(scrim.discord_channel);
        // getSignups populates the cache with signups.
        this.signupService.getSignups(scrim.discord_channel);
      }
    }
  }

  async createScrim(discordChannelID: string, dateTime: Date): Promise<string> {
    const scrimId = await this.db.createNewScrim(dateTime, discordChannelID);
    const scrim: Scrim = {
      active: true,
      dateTime: dateTime,
      discordChannel: discordChannelID,
      id: scrimId,
    };
    this.cache.createScrim(discordChannelID, scrim);
    return scrimId;
  }

  getScrim(discordChannelID: string): Scrim | undefined {
    return this.cache.getScrim(discordChannelID);
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
    const scrimId = this.cache.getScrim(discordChannelID)?.id;
    if (!scrimId) {
      throw Error("No scrim found for that channel");
    }
    await this.db.closeScrim(discordChannelID);
    this.cache.removeScrimChannel(discordChannelID);
  }
}
