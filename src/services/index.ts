import { nhostDb } from "../db/nhost.db";
import { CacheService } from "./cache";
import { RosterService } from "./rosters";
import { ScrimSignups } from "./signups";
import { OverstatService } from "./overstat";
import { PrioService } from "./prio";
import { AuthService } from "./auth";
import { StaticValueService } from "./static-values";

// This file creates all the singleton services
export const cache = new CacheService();
export const overstatService = new OverstatService();
export const staticValueService = new StaticValueService(nhostDb);

export const authService = new AuthService(nhostDb, cache);
export const prioService = new PrioService(nhostDb, cache);
export const signupsService = new ScrimSignups(
  nhostDb,
  cache,
  overstatService,
  prioService,
);
export const rosterService = new RosterService(nhostDb, cache, authService);
