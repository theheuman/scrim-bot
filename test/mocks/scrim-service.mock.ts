import { PrioType, Scrim, ScrimSignup } from "../../src/models/Scrims";
import { User } from "discord.js";

export class ScrimServiceMock {
  constructor() {}

  async createScrim(
    discordChannelID: string,
    dateTime: Date,
    prioType: PrioType | null = null,
  ): Promise<string> {
    console.log(
      "Creating scrim in signup mock",
      discordChannelID,
      dateTime,
      prioType,
    );
    return "";
  }

  // this is a dynamic method that checks if scores have already been computed for a given discordChannel
  // if they have been computed it creates a new scrim entry in the db and computes stats for that one
  // this solves the problem of having multiple lobbies in one scrim.
  async computeScrim(
    discordChannelID: string,
    overstatLinks: string[],
  ): Promise<{ links: string[]; dateTime: Date }> {
    console.log(
      "Computing scrim in signup mock",
      discordChannelID,
      overstatLinks,
    );
    return Promise.resolve({ links: overstatLinks, dateTime: new Date() });
  }

  async closeScrim(discordChannelID: string) {
    console.log("Closing scrim in signup mock", discordChannelID);
    return Promise.resolve();
  }

  getScrim(discordChannelID: string): Promise<Scrim | null> {
    console.log("Getting scrim in signup mock", discordChannelID);
    return Promise.resolve(null);
  }
}
