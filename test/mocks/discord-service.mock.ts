import { Scrim } from "../../src/models/Scrims";

export class DiscordServiceMock {
  constructor() {}

  async updateSignupPostDescription(scrim: Scrim, signupCount: number) {
    console.log("Mock updateSignupPostDescription called", scrim, signupCount);
    return Promise.resolve();
  }

  async sendScoresComputedMessage(
    date: Date,
    lobbies: { name: string; link: string }[],
  ) {
    console.log("Mock sendScoresComputedMessage called", date, lobbies);
    return Promise.resolve();
  }
}
