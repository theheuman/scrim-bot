import { nhostDb } from "../db/nhost.db";
import { CacheService } from "./cache";
import { RosterService } from "./rosters";
import { SignupService } from "./signups";
import { ScrimService } from "./scrim-service";
import { OverstatService } from "./overstat";
import { PrioService } from "./prio";
import { AuthService } from "./auth";
import { StaticValueService } from "./static-values";
import { DiscordService } from "./discord";
import { client } from "../Client";
import { BanService } from "./ban";
import { HuggingFaceService } from "./hugging-face";

// This file creates all the singleton services
export const cache = new CacheService();
export const huggingFaceService = new HuggingFaceService();
export const overstatService = new OverstatService(nhostDb);
export const staticValueService = new StaticValueService(nhostDb);

export const discordService = new DiscordService(client, staticValueService);

export const authService = new AuthService(nhostDb, cache);
export const prioService = new PrioService(nhostDb, cache);
export const banService = new BanService(nhostDb, cache);
export const signupsService = new SignupService(
  nhostDb,
  cache,
  prioService,
  authService,
  discordService,
  banService,
);
export const scrimService = new ScrimService(
  nhostDb,
  cache,
  overstatService,
  huggingFaceService,
  signupsService,
);
export const rosterService = new RosterService(
  nhostDb,
  cache,
  authService,
  discordService,
  banService,
  staticValueService,
);
