import { nhostDb } from "../db/nhost.db";
import { CacheService } from "./cache";
import { RosterService } from "./rosters";
import { ScrimSignups } from "./signups";
import { OverstatService } from "./overstat";
import { PrioService } from "./prio";
import { AuthService } from "./auth";

// This file creates all the singleton services
export const cache = new CacheService();
export const overstatService = new OverstatService();

export const authService = new AuthService(nhostDb, cache);
export const signupsService = new ScrimSignups(nhostDb, cache, overstatService);
export const rosterService = new RosterService(nhostDb, cache);

export const prioService = new PrioService(nhostDb, cache, authService);
