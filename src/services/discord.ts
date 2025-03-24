import { Client } from "discord.js";
import { appConfig } from "../config";
import { StaticValueService } from "./static-values";
import { Scrim } from "../models/Scrims";
import { replaceScrimVariablesFromScrim } from "../utility/utility";

export class DiscordService {
  constructor(
    private client: Client,
    private staticValueService: StaticValueService,
  ) {}

  async updateSignupPostDescription(scrim: Scrim, signupCount: number) {
    const instructionText = await this.staticValueService.getInstructionText();
    if (!instructionText) {
      throw Error("Instruction text not found");
    }
    const updatedMessage = replaceScrimVariablesFromScrim(
      instructionText,
      scrim,
      signupCount,
    );
    const guild = this.client.guilds.cache.get(appConfig.discord.guildId);
    if (!guild) {
      throw Error("Guild not found");
    }

    const forumThread = guild.channels.cache.get(scrim.discordChannel);
    if (!forumThread || forumThread.isThread() === false) {
      throw Error("Forum thread not found or not a valid thread");
    }

    const messages = await forumThread.messages.fetch({ limit: 1 }); // Fetch the first message
    const firstMessage = messages.first();

    if (!firstMessage) {
      throw Error("No messages found in the thread");
    }
    firstMessage.edit(updatedMessage);
  }
}
