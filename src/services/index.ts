import { nhostDb } from "../db/nhost.db";
import { Cache } from "./cache";
import { RosterService } from "./rosters";
import { ScrimSignups } from "./signups";
import { OverstatService } from "./overstat";

// This file creates all the singleton services
export const cache = new Cache();
export const overstatService = new OverstatService();
export const signups = new ScrimSignups(nhostDb, cache, overstatService);
export const rosters = new RosterService(nhostDb, cache);
