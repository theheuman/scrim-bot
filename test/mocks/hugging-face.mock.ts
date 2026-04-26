import { GuildMember } from "discord.js";
import { DiscordRole } from "../../src/models/Role";
import { OverstatTournamentResponse } from "../../src/models/overstatModels";
import { Scrim } from "../../src/models/Scrims";

export class HuggingFaceServiceMock {
  constructor() {}

  async uploadOverstatJson(scrim: Scrim, stats: OverstatTournamentResponse) {
    console.debug(
      "Mock uploading scrim stat json to hugging face",
      scrim,
      stats,
    );
    return Promise.resolve({} as OverstatTournamentResponse);
  }
}
