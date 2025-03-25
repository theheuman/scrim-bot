import { Client } from "discord.js";
import { appConfig } from "../config";
import { StaticValueService } from "./static-values";
import { Scrim } from "../models/Scrims";
import { replaceScrimVariablesFromScrim } from "../utility/utility";
import { ForumThreadChannel } from "discord.js/typings";

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

    const forumThread = guild.channels.cache.get(
      scrim.discordChannel,
    ) as ForumThreadChannel;
    if (!forumThread || forumThread.isThread() === false) {
      throw Error("Forum thread not found or not a valid thread");
    }
    const description = await forumThread.fetchStarterMessage();

    if (!description) {
      throw Error("Signup post description not found");
    }

    await description.edit(updatedMessage);
  }
}
