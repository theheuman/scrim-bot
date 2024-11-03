import { nhostDb } from "../db/nhost.db";
import { Cache } from "./cache";
import { RosterService } from "./rosters";
import { ScrimSignups } from "./signups";

// This file creates all the singleton services
export const cache = new Cache();

export const signups = new ScrimSignups(nhostDb, cache);
export const rosters = new RosterService(nhostDb, cache);
