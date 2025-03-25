import { ForumChannel, PublicThreadChannel } from "discord.js";
import { AdminCommand } from "../../command";
import { CustomInteraction } from "../../interaction";
import { ScrimSignups } from "../../../services/signups";
import { formatInTimeZone } from "date-fns-tz";
import { AuthService } from "../../../services/auth";
import { StaticValueService } from "../../../services/static-values";
import { ForumThreadChannel } from "discord.js/typings";
import { ChannelType } from "discord-api-types/v10";
import {
  getScrimInfoTimes,
  isForumChannel,
  replaceScrimVariables,
} from "../../../utility/utility";

export class CreateScrimCommand extends AdminCommand {
  inputNames = {
    date: "datetime",
    name: "name",
    channel: "forum-channel",
  };

  constructor(
    authService: AuthService,
    private signupService: ScrimSignups,
    private staticValueService: StaticValueService,
  ) {
    super(
      authService,
      "create-scrim",
      "Creates a new scrim, including a new text channel and signup instructions",
    );
    this.addDateInput(this.inputNames.date, "Choose date of the scrim. ", true);
    this.addChannelInput(this.inputNames.channel, "Forum to post in", {
      isRequired: true,
      channelTypes: [ChannelType.GuildForum],
    });
    this.addStringInput(
      this.inputNames.name,
      "The name of the scrim (open, tendies, etc...)",
      {
        maxLength: 25,
      },
    );
  }

  async run(interaction: CustomInteraction) {
    const scrimDate = interaction.options.getDateTime(
      this.inputNames.date,
      true,
    );
    const channel = interaction.options.getChannel(
      this.inputNames.channel,
      true,
      [ChannelType.GuildForum],
    );
    const scrimName = interaction.options.getString(this.inputNames.name) ?? "";

    // just to triple check
    if (!isForumChannel(channel)) {
      await interaction.editReply(
        "Scrim post could not be created. Channel provided is not a forum channel",
      );
      return;
    }

    await interaction.editReply({
      content: "Fetched all input and working on your request!",
    });

    let createdThread: PublicThreadChannel;
    try {
      createdThread = await this.createSignupPost(
        channel,
        scrimDate,
        scrimName,
      );
    } catch (error) {
      await interaction.editReply("Scrim post could not be created. " + error);
      return;
    }

    try {
      await this.signupService.createScrim(createdThread.id, scrimDate);
    } catch (error) {
      try {
        await createdThread.delete("Scrim not created correctly in db");
      } catch (e) {
        console.debug(e);
        await interaction.editReply(
          `Scrim not created: ${error}.\n\nPlease delete signup post <#${createdThread.id}>`,
        );
        return;
      }
      await interaction.editReply("Scrim not created: " + error);
      return;
    }

    await interaction.deleteReply();
    await interaction.followUp(
      `Scrim created. Channel: <#${createdThread.id}>`,
    );
  }

  private async createSignupPost(
    forumChannel: ForumChannel,
    scrimDate: Date,
    scrimName: string,
  ): Promise<ForumThreadChannel> {
    const introMessage = await this.getIntroMessage(scrimDate);

    const postName = `${formatInTimeZone(scrimDate, "America/New_York", "M/d haaa")} ${scrimName}`;

    return forumChannel.threads.create({
      name: postName,
      message: {
        content: introMessage,
      },
    });
  }

  private async getIntroMessage(scrimDate: Date): Promise<string> {
    const instructionText = await this.staticValueService.getInstructionText();
    if (!instructionText) {
      throw Error("Can't get instruction text from db");
    }

    const { lobbyPostDate, lowPrioDate, draftDate } =
      getScrimInfoTimes(scrimDate);

    return replaceScrimVariables(instructionText, {
      scrimTime: this.formatTime(scrimDate),
      scrimDate: this.formatDate(scrimDate),
      lobbyPostTime: this.formatTime(lobbyPostDate),
      lowPrioTime: this.formatTime(lowPrioDate),
      draftTime: this.formatTime(draftDate),
      signupCount: "0",
    });
  }
}
