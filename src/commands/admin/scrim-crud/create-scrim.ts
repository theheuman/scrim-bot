// Importing SlashCommandBuilder is required for every slash command
// We import PermissionFlagsBits so we can restrict this command usage
// We also import ChannelType to define what kind of channel we are creating
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ChatInputCommandInteraction,
  CategoryChannel,
  SlashCommandStringOption,
  TextChannel,
  Guild,
} from "discord.js";
import { signupsService } from "../../../services";
import { format, getTimezoneOffset } from "date-fns-tz";

const expectedDateFormat = "Expected MM/dd";
const expectedTimeFormat = "Expected hh:mm pm";

const dateArg = "date";
const timeArg = "time";
const nameArg = "name";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("createscrim") // Command name matching file name
    .setDescription("Creates a new scrim signup text channel")
    // Text channel name
    .addStringOption((option: SlashCommandStringOption) =>
      option
        .setName(dateArg) // option names need to always be lowercase and have no spaces
        .setDescription("Choose date of the scrim. " + expectedDateFormat)
        .setMinLength(3) // A text channel needs to be named
        .setMaxLength(5) // Discord will cut-off names past the 25 characters,
        // so that's a good hard limit to set. You can manually increase this if you wish
        .setRequired(true),
    )
    .addStringOption((option: SlashCommandStringOption) =>
      option
        .setName(timeArg)
        .setDescription(
          "Choose the time of the scrim in eastern time include am or pm. " +
            expectedTimeFormat,
        )
        .setMinLength(3)
        .setMaxLength(4)
        .setRequired(true),
    )
    .addStringOption((option: SlashCommandStringOption) =>
      option
        .setName(nameArg)
        .setDescription("The name of the scrim (open, tendies, etc...")
        .setMinLength(1)
        .setMaxLength(25)
        .setRequired(true),
    )
    // You will usually only want users that can create new channels to
    // be able to use this command and this is what this line does.
    // Feel free to remove it if you want to allow any users to
    // create new channels
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    // It's impossible to create normal text channels inside DMs, so
    // it's in your best interest in disabling this command through DMs
    // as well. Threads, however, can be created in DMs, but we will see
    // more about them later in this post
    .setDMPermission(false),
  async execute(interaction: ChatInputCommandInteraction) {
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

    const scrimDateString = interaction.options.getString(dateArg, true);
    const scrimTimeString = interaction.options.getString(timeArg, true);
    const scrimName = interaction.options.getString(nameArg, true);

    let scrimDate: Date;
    try {
      scrimDate = parseScrimDate(scrimDateString, scrimTimeString);
    } catch (e) {
      interaction.reply(
        `Can't parse date: ${e}; please supply correct format ${expectedDateFormat} ${expectedTimeFormat}`,
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
    const chosenChannelName = `${controllerSpacer}${dateStringForTitle}-${format(scrimDate, "ha")}-eastern-${scrimName}-scrims`;

    // create channel in method
    // get channel or throw channel error
    // create scrim
    // if scrim not created delete channel and throw db error
    // send message in channel, let user know if fails but don't throw error
    // reply everything created

    let createdChannel: TextChannel;
    try {
      createdChannel = await createSignupChannel(
        interaction.guild,
        (interaction.channel as TextChannel).parent,
        chosenChannelName,
      );
    } catch (error) {
      await interaction.editReply("Scrim channel could not be created" + error);
      return;
    }

    try {
      await signupsService.createScrim(createdChannel.id, scrimDate);
    } catch (error) {
      await interaction.editReply("Scrim not created" + error);
      return;
    }

    const discordTimeString = `<t:${Math.floor(scrimDate.valueOf() / 1000)}:t>`;
    await createdChannel.send(
      `Scrims will begin at ${discordTimeString} Eastern on the posted date. If there are fewer than 20 sign ups by 3:00pm on that day then scrims will be cancelled.\n\nWhen signing up please sign up with the format " Team Name - @ Player 1 @ Player 2 @ Player 3" If you use @TBD or a duplicate name you will lose your spot in the scrim. POI Draft will take place one hour before match start in DRAFT 1.\n\nIf we have enough teams for multiple lobbies, seeding will be announced before draft and additional drafts will happen in DRAFT 2, etc.\n\nLook in <#1267487335956746310> and this channel for codes and all necessary information, to be released the day of scrims`,
    );
    await interaction.editReply(
      `Scrim created. Channel: <#${createdChannel.id}>`,
    );
  },
};

const createSignupChannel = (
  guild: Guild,
  category: CategoryChannel | null,
  channelName: string,
): Promise<TextChannel> => {
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
};

// throws if unparseable
const parseScrimDate = (monthDay: string, time: string) => {
  const { monthString, dayString } = getMonthDayString(monthDay);
  const timeString = getTimeString(time);
  const now = new Date();
  let calculatedYear = now.getFullYear();
  // if we're in december setting up a january scrim use correct year
  if (monthString === "01" && now.getMonth() >= 1) {
    calculatedYear++;
  }
  const utcOffset = getUtcOffset();
  const dateString = `${calculatedYear}-${monthString}-${dayString}T${timeString}${utcOffset}`;
  return new Date(dateString);
};

const getMonthDayString = (monthDay: string) => {
  const monthDaySplit = monthDay.split("/");
  const month = Number(monthDaySplit[0]);
  const day = Number(monthDaySplit[1]);
  if (month <= 0 || month > 12) {
    throw Error("Month not parseable");
  } else if (day <= 0 || day > 31) {
    throw Error("Day not parseable");
  }
  const monthString = String(month).padStart(2, "0");
  const dayString = String(day).padStart(2, "0");
  return { monthString, dayString };
};

// expected format hh:mm am
const getTimeString = (time: string) => {
  const timeArray = time.trim().split(" ");
  const hourMinuteString = timeArray[0];
  const ampmLabel = timeArray[1].toLowerCase();
  const hourMinuteArray = hourMinuteString.split(":");
  const hour = Number(hourMinuteArray[0]);
  let minute = Number(hourMinuteArray[1]);
  if (hour <= 0 || hour > 12) {
    throw Error("Hour not valid");
  } else if (isNaN(minute)) {
    minute = 0;
  } else if (minute < 0 || minute > 59) {
    throw Error("Minute not valid");
  }

  let hourString;
  if (ampmLabel === "am") {
    if (hour == 12) {
      hourString = "00";
    } else {
      hourString = hour.toString().padStart(2, "0");
    }
    // check if 12, else keep same
  } else if (ampmLabel === "pm") {
    if (hour == 12) {
      hourString = "12";
    } else {
      hourString = (hour + 12).toString().padStart(2, "0");
    }
  } else {
    throw Error("am/pm Label is invalid");
  }
  const minuteString = minute.toString().padStart(2, "0");
  return `${hourString}:${minuteString}:00`;
};

const getUtcOffset = () => {
  const offsetHours = getTimezoneOffset("America/New_York") / 60 / 60 / 1000;
  return `-${String(Math.abs(offsetHours)).padStart(2, "0")}:00`;
};
