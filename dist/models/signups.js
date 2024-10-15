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
Object.defineProperty(exports, "__esModule", { value: true });
exports.signups = exports.ScrimSignups = void 0;
const nhost_db_1 = require("../db/nhost.db");
class ScrimSignups {
    constructor(db) {
        this.activeScrimSignups = new Map();
        this.db = db;
        this.scrimChannelMap = new Map();
        this.updateActiveScrims();
    }
    updateActiveScrims() {
        return __awaiter(this, void 0, void 0, function* () {
            const activeScrims = yield this.db.getActiveScrims();
            for (const scrim of activeScrims.scrims) {
                if (scrim.id && scrim.discord_channel) {
                    this.scrimChannelMap.set(scrim.discord_channel, scrim.id);
                    this.getSignups(scrim.id);
                }
            }
        });
    }
    createScrim(discordChannelID, dateTime) {
        return __awaiter(this, void 0, void 0, function* () {
            const scrimId = yield this.db.createNewScrim(dateTime, discordChannelID, 1);
            this.scrimChannelMap.set(discordChannelID, scrimId);
            this.activeScrimSignups.set(scrimId, []);
            return scrimId;
        });
    }
    addTeam(scrimId, teamName, players) {
        return __awaiter(this, void 0, void 0, function* () {
            // potentially need to update active scrim signups here if we ever start creating scrims from something that is not the bot
            const scrim = this.activeScrimSignups.get(scrimId);
            if (!scrim) {
                throw Error("No active scrim with that scrim id");
            }
            else if (players.length !== 3) {
                throw Error("Exactly three players must be provided");
            }
            else if (players[0].id === players[1].id || players[0].id === players[2].id || players[1].id === players[2].id) {
                throw Error("Duplicate player");
            }
            // yes this is a three deep for loop, this is a cry for help, please optimize this
            for (const team of scrim) {
                if (team.teamName === teamName) {
                    throw Error("Duplicate team name");
                }
                for (const id of team.players.map((player) => player.discordId)) {
                    for (const player of players) {
                        if (player.id === id) {
                            throw Error(`Player already signed up on different team: ${player.displayName} <@${id}> on team ${team.teamName}`);
                        }
                    }
                }
            }
            const convertedPlayers = players.map((discordUser) => ({ discordId: discordUser.id, displayName: discordUser.displayName }));
            const playerIds = yield this.db.insertPlayers(convertedPlayers);
            const signupId = yield this.db.addScrimSignup(teamName, scrimId, playerIds[0], playerIds[1], playerIds[2]);
            const mappedPlayers = convertedPlayers.map((player, index) => ({ id: playerIds[index], displayName: player.displayName, discordId: player.discordId, overstatLink: player.overstatLink, elo: player.elo }));
            scrim.push({
                teamName: teamName,
                players: mappedPlayers,
                signupId,
            });
            return signupId;
        });
    }
    removeTeam(discordChannel, teamName) {
        const scrimId = this.scrimChannelMap.get(discordChannel);
        if (!scrimId) {
            throw Error("No scrim id matching that scrim channel present, contact admin");
        }
        return this.db.removeScrimSignup(teamName, scrimId);
    }
    replaceTeammate(discordChannel, teamName, oldPlayer, newPlayer) {
        return __awaiter(this, void 0, void 0, function* () {
            const scrimId = this.scrimChannelMap.get(discordChannel);
            if (!scrimId) {
                throw Error("No scrim id matching that scrim channel present, contact admin");
            }
            const convertedOldPlayer = { discordId: oldPlayer.id, displayName: oldPlayer.displayName };
            const convertedNewPlayer = { discordId: newPlayer.id, displayName: newPlayer.displayName };
            const playerIds = yield this.db.insertPlayers([convertedOldPlayer, convertedNewPlayer]);
            return this.db.replaceTeammate(scrimId, teamName, playerIds[0], playerIds[1]);
        });
    }
    // TODO cacheing here?
    getSignups(scrimId) {
        return __awaiter(this, void 0, void 0, function* () {
            const scrimData = yield this.db.getScrimSignupsWithPlayers(scrimId);
            const teams = [];
            for (const signupData of scrimData) {
                const teamData = ScrimSignups.convertDbToScrimSignup(signupData);
                teams.push(teamData);
            }
            // TODO make call for all users who are low prio
            this.activeScrimSignups.set(scrimId, teams);
            return ScrimSignups.sortTeams(teams);
        });
    }
    static sortTeams(teams) {
        const waitlistCutoff = 20;
        teams.sort((teamA, teamB) => {
            const lowPrioAmountA = teamA.players.reduce((count, player) => player.lowPrio ? count + 1 : count, 0);
            const lowPrioAmountB = teamB.players.reduce((count, player) => player.lowPrio ? count + 1 : count, 0);
            return lowPrioAmountA - lowPrioAmountB;
        });
        return { mainList: teams.splice(0, waitlistCutoff), waitList: teams };
    }
    static convertDbToScrimSignup(dbTeamData) {
        return {
            signupId: 'for now we dont get the id',
            teamName: dbTeamData.team_name,
            players: this.convertToPlayers(dbTeamData),
        };
    }
    static convertToPlayers(dbTeamData) {
        return [
            {
                id: dbTeamData.player_one_id,
                displayName: dbTeamData.player_one_display_name,
                discordId: dbTeamData.player_one_discord_id,
                overstatLink: dbTeamData.player_one_overstat_link,
                elo: dbTeamData.player_one_elo,
            },
            {
                id: dbTeamData.player_two_id,
                displayName: dbTeamData.player_two_display_name,
                discordId: dbTeamData.player_two_discord_id,
                overstatLink: dbTeamData.player_two_overstat_link,
                elo: dbTeamData.player_two_elo,
            },
            {
                id: dbTeamData.player_three_id,
                displayName: dbTeamData.player_three_display_name,
                discordId: dbTeamData.player_three_discord_id,
                overstatLink: dbTeamData.player_three_overstat_link,
                elo: dbTeamData.player_three_elo,
            },
        ];
    }
}
exports.ScrimSignups = ScrimSignups;
exports.signups = new ScrimSignups(nhost_db_1.nhostDb);
exports.default = exports.signups;
