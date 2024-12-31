import { ChannelType, CategoryChannel, TextChannel, Guild } from "discord.js";
import { Command } from "../../command";
import { CustomInteraction } from "../../interaction";
import { ScrimSignups } from "../../../services/signups";
import { parseDate } from "../../../utility/time";
import { formatInTimeZone } from "date-fns-tz";

export class CreateScrimCommand extends Command {
  expectedDateFormat = "Expected MM/dd";
  expectedTimeFormat = "Expected hh:mm pm";

  inputNames = {
    date: "date",
    time: "time",
    name: "name",
  };

  constructor(private signupService: ScrimSignups) {
    super(
      "create-scrim",
      "Creates a new scrim, including a new text channel and signup instructions",
      true,
    );
    this.addStringInput(
      this.inputNames.date,
      "Choose date of the scrim. " + this.expectedDateFormat,
      true,
    );
    // .setMinLength(3) // A text channel needs to be named
    // .setMaxLength(5)
    this.addStringInput(
      this.inputNames.time,
      "Choose the time of the scrim in eastern time include am or pm. " +
        this.expectedTimeFormat,
      true,
    );
    // .setMinLength(3) // A text channel needs to be named
    // .setMaxLength(4) // Discord will cut-off names past the 25 characters,
    this.addStringInput(
      this.inputNames.name,
      "The name of the scrim (open, tendies, etc...",
    );
    //.setMinLength(1)
    //.setMaxLength(25)
  }

  async run(interaction: CustomInteraction) {
    if (!interaction.guild) {
      interaction.reply("Can't find server, contact admin");
      return;
    }
    if (!interaction.channel) {
      interaction.reply(
        "Can't find channel command was sent from, contact admin",
      );
      return;
    }

    const scrimDateString = interaction.options.getString(
      this.inputNames.date,
      true,
    );
    const scrimTimeString = interaction.options.getString(
      this.inputNames.time,
      true,
    );
    const scrimName = interaction.options.getString(this.inputNames.name, true);

    let scrimDate: Date;
    try {
      scrimDate = parseDate(scrimDateString, scrimTimeString);
    } catch (e) {
      interaction.reply(
        `Can't parse arguments: ${e}; please supply correct format ${this.expectedDateFormat} ${this.expectedTimeFormat}`,
      );
      return;
    }

    // Discord only gives us 3 seconds to acknowledge an interaction before
    // the interaction gets voided and can't be used anymore.
    await interaction.reply({
      content: "Fetched all input and working on your request!",
    });

    const dateStringForTitle = `${scrimDate.getMonth() + 1}-${scrimDate.getDate()}`;
    const controllerSpacer = `🎮┋`;
    const chosenChannelName = `${controllerSpacer}${dateStringForTitle}-${formatInTimeZone(scrimDate, "America/New_York", "ha")}-eastern-${scrimName}-scrims`;

    // create channel in method
    // get channel or throw channel error
    // create scrim
    // if scrim not created delete channel and throw db error
    // send message in channel, let user know if fails but don't throw error
    // reply everything created

    let createdChannel: TextChannel;
    try {
      createdChannel = await this.createSignupChannel(
        interaction.guild,
        (interaction.channel as TextChannel).parent,
        chosenChannelName,
      );
    } catch (error) {
      await interaction.editReply(
        "Scrim channel could not be created: " + error,
      );
      return;
    }

    try {
      await this.signupService.createScrim(createdChannel.id, scrimDate);
    } catch (error) {
      await interaction.editReply("Scrim not created: " + error);
      return;
    }

    const discordTimeString = `<t:${Math.floor(scrimDate.valueOf() / 1000)}:t>`;
    await createdChannel.send(
      `Scrims will begin at ${discordTimeString} Eastern on the posted date. If there are fewer than 20 sign ups by 3:00pm on that day then scrims will be cancelled.\n\nWhen signing up please sign up with the format " Team Name - @ Player 1 @ Player 2 @ Player 3" If you use @TBD or a duplicate name you will lose your spot in the scrim. POI Draft will take place one hour before match start in DRAFT 1.\n\nIf we have enough teams for multiple lobbies, seeding will be announced before draft and additional drafts will happen in DRAFT 2, etc.\n\nLook in <#1267487335956746310> and this channel for codes and all necessary information, to be released the day of scrims`,
    );
    await interaction.editReply(
      `Scrim created. Channel: <#${createdChannel.id}>`,
    );
  }

  createSignupChannel(
    guild: Guild,
    category: CategoryChannel | null,
    channelName: string,
  ): Promise<TextChannel> {
    if (category) {
      // If the channel where the command belongs to a category,
      // create another channel in the same category.
      return category.children.create({
        name: channelName, // The name given to the channel by the user
        type: ChannelType.GuildText, // The type of the channel created.
        // Since "text" is the default channel created, this could be ommitted
      });
    } else {
      // If the channel where the command was used is stray,
      // create another stray channel in the server.
      return guild.channels.create({
        name: channelName, // The name given to the channel by the user
        type: ChannelType.GuildText, // The type of the channel created.
        // Since "text" is the default channel created, this could be ommitted
      });
      // Notice how we are creating a channel in the list of channels
      // of the server. This will cause the channel to spawn at the top
      // of the channels list, without belonging to any categories
    }
  }
}
