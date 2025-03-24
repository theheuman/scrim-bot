import { Scrim } from "../../src/models/Scrims";

export class DiscordServiceMock {
  constructor() {}

  async updateSignupPostDescription(scrim: Scrim, signupCount: number) {
    console.log("Mock updateSignupPostDescription called", scrim, signupCount);
    return Promise.resolve();
  }
}
