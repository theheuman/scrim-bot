import {
  Snowflake,
  Channel,
  ForumChannel,
  PublicThreadChannel,
  Collection,
} from "discord.js";
import { AdminCommand } from "../../command";
import { CustomInteraction } from "../../interaction";
import { ScrimSignups } from "../../../services/signups";
import { formatInTimeZone } from "date-fns-tz";
import { AuthService } from "../../../services/auth";
import { StaticValueService } from "../../../services/static-values";
import { ForumThreadChannel } from "discord.js/typings";

export class CreateScrimCommand extends AdminCommand {
  inputNames = {
    date: "date",
    name: "name",
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
    const scrimName = interaction.options.getString(this.inputNames.name, true);

    // Discord only gives us 3 seconds to acknowledge an interaction before
    // the interaction gets voided and can't be used anymore.
    await interaction.reply({
      content: "Fetched all input and working on your request!",
    });

    let createdChannel: PublicThreadChannel;
    try {
      createdChannel = await this.createSignupPost(
        interaction,
        scrimDate,
        scrimName,
      );
    } catch (error) {
      await interaction.editReply(
        "Scrim channel could not be created. " + error,
      );
      return;
    }

    try {
      await this.signupService.createScrim(createdChannel.id, scrimDate);
    } catch (error) {
      await interaction.editReply("Scrim not created: " + error);
      return;
    }

    await interaction.editReply(
      `Scrim created. Channel: <#${createdChannel.id}>`,
    );
  }

  private async createSignupPost(
    interaction: CustomInteraction,
    scrimDate: Date,
    scrimName: string,
  ): Promise<ForumThreadChannel> {
    const forumChannel = await this.getSignupsForum(
      interaction.client.channels.cache,
    );
    const introMessage = await this.getIntroMessage(scrimDate);

    const postName = `${formatInTimeZone(scrimDate, "America/New_York", "M/d haaa")} ${scrimName}`;

    return forumChannel.threads.create({
      name: postName,
      message: {
        content: introMessage,
      },
    });
  }

  private async getSignupsForum(
    channels: Collection<Snowflake, Channel>,
  ): Promise<ForumChannel> {
    const channelId = await this.staticValueService.getSignupsChannelId();
    if (!channelId) {
      throw Error("Can't get signups forum channel id from db");
    }
    const channel = channels.get(channelId) as ForumChannel | undefined;
    if (!channel) {
      throw Error(
        "Can't find forum channel in server, looking for id: " + channelId,
      );
    }
    return channel;
  }

  private async getIntroMessage(scrimDate: Date): Promise<string> {
    const instructionText = await this.staticValueService.getInstructionText();
    if (!instructionText) {
      throw Error("Can't get instruction text from db");
    }
    return instructionText.replace("${scrimTime}", this.formatTime(scrimDate));
  }
}
