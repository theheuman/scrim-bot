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
const discord_js_1 = require("discord.js");
const signups_1 = __importDefault(require("../../models/signups"));
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('signup')
        .setDescription('Creates a new scrim signup')
        .addStringOption(option => option
        .setName('teamname')
        .setDescription('Team name')
        .setMinLength(1)
        .setMaxLength(150)
        .setRequired(true))
        .addUserOption(option => option.setName('player1')
        .setDescription('@player1')
        .setRequired(true))
        .addUserOption(option => option.setName('player2')
        .setDescription('@player2')
        .setRequired(true))
        .addUserOption(option => option.setName('player3')
        .setDescription('@player3')
        .setRequired(true)),
    execute(interaction) {
        return __awaiter(this, void 0, void 0, function* () {
            const channelId = interaction.channelId;
            const teamName = interaction.options.getString('teamname');
            const player1 = interaction.options.getUser('player1');
            const player2 = interaction.options.getUser('player2');
            const player3 = interaction.options.getUser('player3');
            if (!teamName) {
                yield interaction.reply(`Signup NOT registered, no team name provided`);
                return;
            }
            else if (!player1 || !player2 || !player3) {
                yield interaction.reply(`Signup NOT registered, a team needs three players`);
                return;
            }
            const scrimId = signups_1.default.scrimChannelMap.get(channelId);
            if (scrimId) {
                try {
                    const signupId = yield signups_1.default.addTeam(scrimId, teamName, [player1, player2, player3]);
                    interaction.reply(`Team ${teamName} signed up with players: ${player1}, ${player2}, ${player3}, Signup id: ${signupId}`);
                }
                catch (error) {
                    interaction.reply(`Team not created: ${error === null || error === void 0 ? void 0 : error.message}`);
                }
            }
            else if (scrimId) {
                interaction.reply("Associated scrim not found, team not created, this is probably a configuration error, contact admins");
            }
        });
    }
};
