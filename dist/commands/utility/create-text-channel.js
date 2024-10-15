"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Importing SlashCommandBuilder is required for every slash command
// We import PermissionFlagsBits so we can restrict this command usage
// We also import ChannelType to define what kind of channel we are creating
const discord_js_1 = require("discord.js");
const signups_1 = __importDefault(require("../../models/signups"));
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('createscrimsignup') // Command name matching file name
        .setDescription('Creates a new scrim signup text channel')
        // Text channel name
        .addStringOption((option) => option
        .setName('scrimdate') // option names need to always be lowercase and have no spaces
        .setDescription('Choose date of the scrim')
        .setMinLength(3) // A text channel needs to be named
        .setMaxLength(5) // Discord will cut-off names past the 25 characters,
        // so that's a good hard limit to set. You can manually increase this if you wish
        .setRequired(true))
        .addStringOption((option) => option
        .setName('scrimtime') // option names need to always be lowercase and have no spaces
        .setDescription('Choose the time of the scrim')
        .setMinLength(3) // A text channel needs to be named
        .setMaxLength(4) // Discord will cut-off names past the 25 characters,
        // so that's a good hard limit to set. You can manually increase this if you wish
        .setRequired(true))
        .addStringOption((option) => option
        .setName('scrimtype') // option names need to always be lowercase and have no spaces
        .setDescription('Choose the type of scrim')
        .setMinLength(1) // A text channel needs to be named
        .setMaxLength(25) // Discord will cut-off names past the 25 characters,
        // so that's a good hard limit to set. You can manually increase this if you wish
        .setRequired(true))
        // You will usually only want users that can create new channels to
        // be able to use this command and this is what this line does.
        // Feel free to remove it if you want to allow any users to
        // create new channels
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageChannels)
        // It's impossible to create normal text channels inside DMs, so
        // it's in your best interest in disabling this command through DMs
        // as well. Threads, however, can be created in DMs, but we will see
        // more about them later in this post
        .setDMPermission(false),
    execute(interaction) {
        return __awaiter(this, void 0, void 0, function* () {
            /*
             TODO change variable names for date, time, type
             can we change so discord only accepts date times?
      
             reply that channel was created
             try to add scrim to db, if unsucessfull, delete channel, reply with error
             */
            // Before executing any other code, we need to acknowledge the interaction.
            // Discord only gives us 3 seconds to acknowledge an interaction before
            // the interaction gets voided and can't be used anymore.
            yield interaction.reply({
                content: 'Fetched all input and working on your request!',
            });
            // After acknowledging the interaction, we retrieve the string sent by the user
            const channelDate = interaction.options.getString('scrimdate');
            const channelTime = interaction.options.getString('scrimtime');
            const channelType = interaction.options.getString('scrimtype');
            const controllerSpacer = `🎮┋`;
            const chosenChannelName = `${controllerSpacer}${channelDate}-${channelTime}-eastern-${channelType}-scrims`;
            // Do note that the string passed to the method .getString() needs to
            // match EXACTLY the name of the option provided (line 12 in this file).
            // If it's not a perfect match, this will always return null
            let channelId;
            try {
                // Check if this channel where the command was used is stray
                if (!interaction.channel.parent) {
                    // If the channel where the command was used is stray,
                    // create another stray channel in the server.
                    const createdChannel = yield interaction.guild.channels.create({
                        name: chosenChannelName, // The name given to the channel by the user
                        type: discord_js_1.ChannelType.GuildText, // The type of the channel created.
                        // Since "text" is the default channel created, this could be ommitted
                    });
                    // Notice how we are creating a channel in the list of channels
                    // of the server. This will cause the channel to spawn at the top
                    // of the channels list, without belonging to any categories (more on that later)
                    channelId = createdChannel.id;
                    // If we managed to create the channel, edit the initial response with
                    // a success message
                    yield interaction.editReply({
                        content: 'Your channel was successfully created!',
                    });
                    return;
                }
                // Check if this channel where the command was used belongs to a category
                else if (interaction.channel.parent) {
                    // If the channel where the command belongs to a category,
                    // create another channel in the same category.
                    const createdChannel = yield interaction.channel.parent.children.create({
                        name: chosenChannelName, // The name given to the channel by the user
                        type: discord_js_1.ChannelType.GuildText, // The type of the channel created.
                        // Since "text" is the default channel created, this could be ommitted
                    });
                    channelId = createdChannel.id;
                    // If we managed to create the channel, edit the initial response with
                    // a success message
                    yield interaction.editReply({
                        content: `Channel created <#${channelId}>`,
                    });
                }
                if (channelId) {
                    const dateTime = `${channelDate} - ${channelTime}`;
                    console.log(dateTime);
                    const scrimDate = new Date(dateTime);
                    signups_1.default.createScrim(channelId, scrimDate);
                    const channel = yield interaction.client.channels.cache.get(channelId);
                    if (channel && channel.isTextBased()) {
                        yield channel.send(`Scrims will begin at ${channelTime} Eastern on the posted date. If there are fewer than 20 sign ups by 3:00pm on that day then scrims will be cancelled.\n\nWhen signing up please sign up with the format " Team Name - @ Player 1 @ Player 2 @ Player 3" If you use @TBD or a duplicate name you will lose your spot in the scrim. POI Draft will take place one hour before match start in DRAFT 1.\n\nIf we have enough teams for multiple lobbies, seeding will be announced before draft and additional drafts will happen in DRAFT 2, etc.\n\nLook in <#1267487335956746310> and this channel for codes and all necessary information, to be released the day of scrims`);
                    }
                    else {
                        console.error('Channel is not text-based or does not exist.');
                    }
                }
                else {
                    console.error("MISSING CHANNEL ID");
                }
                return;
            }
            catch (error) {
                // If an error occurred and we were not able to create the channel
                // the bot is most likely received the "Missing Permissions" error.
                // Log the error to the console
                console.log(error);
                // Also inform the user that an error occurred and give them feedback
                // about how to avoid this error if they want to try again
                yield interaction.editReply({
                    content: 'Your channel could not be created! Please check if the bot has the necessary permissions!',
                });
            }
        });
    },
};
