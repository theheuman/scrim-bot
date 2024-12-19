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
} from "discord.js";
import { signupsService } from "../../../services";

const expectedDateFormat = "Expected MM/dd";
const expectedTimeFormat = "Expected hhpm";

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
    /*
       TODO change variable names for date, time, type
       can we change so discord only accepts date times?

       reply that channel was created
       try to add scrim to db, if unsuccessful, delete channel, reply with error
       */

    // After acknowledging the interaction, we retrieve the string sent by the user
    const scrimDateString = interaction.options.getString(dateArg, true);
    const scrimTimeString = interaction.options.getString(timeArg, true);
    const scrimName = interaction.options.getString(nameArg, true);

    // TODO parse date and time and create a date object
    const scrimDate = new Date(scrimDateString + scrimTimeString);
    const dateString = `${scrimDate.getMonth() + 1}-${scrimDate.getDate()}`;

    if (!interaction.guild) {
      interaction.reply("Can't find server, contact admin");
      return;
    }
    // TODO if we parsed and accepted input as expected return all good, else ask for better input
    if (!dateString) {
      interaction.reply(
        "Unable to parse date, please supply correct format. " +
          expectedDateFormat,
      );
    }
    if (!dateString) {
      interaction.reply(
        "Unable to parse time, please supply correct format. " +
          expectedTimeFormat,
      );
    }

    // Discord only gives us 3 seconds to acknowledge an interaction before
    // the interaction gets voided and can't be used anymore.
    await interaction.reply({
      content: "Fetched all input and working on your request!",
    });

    const controllerSpacer = `🎮┋`;
    const chosenChannelName = `${controllerSpacer}${dateString}-eastern-${scrimName}-scrims`;

    // create channel in method
    // get channel or throw channel error
    // create scrim
    // if scrim not created delete channel and throw db error
    // send message in channel, let user know if fails but don't throw error
    // reply everything created

    let createdChannel: TextChannel | undefined = undefined;
    // TODO why did supreme put channel creation in a try catch, can an error be thrown here?
    try {
      const channel = interaction.channel as TextChannel;
      const category = channel.parent as CategoryChannel;
      if (category) {
        // If the channel where the command belongs to a category,
        // create another channel in the same category.
        createdChannel = await category.children.create({
          name: chosenChannelName, // The name given to the channel by the user
          type: ChannelType.GuildText, // The type of the channel created.
          // Since "text" is the default channel created, this could be ommitted
        });
      } else {
        // If the channel where the command was used is stray,
        // create another stray channel in the server.
        createdChannel = await interaction.guild.channels.create({
          name: chosenChannelName, // The name given to the channel by the user
          type: ChannelType.GuildText, // The type of the channel created.
          // Since "text" is the default channel created, this could be ommitted
        });
        // Notice how we are creating a channel in the list of channels
        // of the server. This will cause the channel to spawn at the top
        // of the channels list, without belonging to any categories
      }
    } catch (error) {
      // If an error occurred and we were not able to create the channel
      // the bot is most likely received the "Missing Permissions" error.
      await interaction.editReply("Your channel could not be created!" + error);
      return;
    }

    try {
      signupsService.createScrim(createdChannel.id, scrimDate);
    } catch (error) {
      await interaction.editReply("Scrim not created" + error);
    }

    await createdChannel.send(
      `Scrims will begin at ${scrimTimeString} Eastern on the posted date. If there are fewer than 20 sign ups by 3:00pm on that day then scrims will be cancelled.\n\nWhen signing up please sign up with the format " Team Name - @ Player 1 @ Player 2 @ Player 3" If you use @TBD or a duplicate name you will lose your spot in the scrim. POI Draft will take place one hour before match start in DRAFT 1.\n\nIf we have enough teams for multiple lobbies, seeding will be announced before draft and additional drafts will happen in DRAFT 2, etc.\n\nLook in <#1267487335956746310> and this channel for codes and all necessary information, to be released the day of scrims`,
    );
    await interaction.editReply(
      `Scrim created, channel: <#${createdChannel.id}>`,
    );
  },
};
