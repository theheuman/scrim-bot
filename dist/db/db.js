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
exports.DB = void 0;
class DB {
    createNewScrim(dateTime, discordChannelID, skill, overstatLink = null) {
        return this.post("scrims", {
            date_time_field: dateTime.toISOString(),
            skill,
            overstat_link: overstatLink,
            discord_channel: discordChannelID,
        });
    }
    addScrimSignup(teamName, scrimId, playerId, playerTwoId, playerThreeId, combinedElo = null) {
        return this.post("scrim_signups", {
            team_name: teamName,
            scrim_id: scrimId,
            player_one_id: playerId,
            player_two_id: playerTwoId,
            player_three_id: playerThreeId,
            combined_elo: combinedElo
        });
    }
    removeScrimSignup(teamName, scrimId) {
        return this.delete("scrim_signups", {
            scrim_id: scrimId,
            team_name: teamName,
        });
    }
    // returns id
    insertPlayerIfNotExists(discordId, displayName, overstatLink) {
        return __awaiter(this, void 0, void 0, function* () {
            const overstatLinkObjectSuffix = overstatLink ? `, overstat_link: "${overstatLink}"` : '';
            const overstatLinkColumn = overstatLink ? `\n              overstat_link` : '';
            const query = `
      mutation upsertPlayer {
        insert_players_one(
          object: {discord_id: "${discordId}", display_name: "${displayName}"${overstatLinkObjectSuffix}}
          on_conflict: {
            constraint: players_discord_id_key,  # Unique constraint on discord_id
            update_columns: [
              display_name${overstatLinkColumn}
            ]
          }
        ) {
          id  # Return the ID of the player, whether newly inserted or found
        }
      }
    `;
            const result = yield this.customQuery(query);
            const returnedData = result;
            return returnedData.insert_players_one.id;
        });
    }
    /* returns list of id's
     *
     * Created a special method that inserts players if they do not exist, also takes special care not to overwrite overstats and elo if they are in DB but not included in player object
     */
    insertPlayers(players) {
        return __awaiter(this, void 0, void 0, function* () {
            const playerUpdates = players.map((player, index) => this.generatePlayerUpdateQuery(player, (index + 1).toString())).join("\n\n");
            const playerInsert = `
      insert_players(objects: [
        ${players.map((player) => `{discord_id: "${player.discordId}", display_name: "${player.displayName}"}`).join('\n')}
      ]
        on_conflict: {
          constraint: players_discord_id_key,   # Unique constraint on discord_id
          update_columns: [
            display_name  # necessary for graphql to actually return an id
          ]
        }
      ) {
        returning {
          id
        }
      }
    `;
            const query = `
      mutation upsertPlayer {
        ${playerInsert}

        ${playerUpdates}
      }
    `;
            const result = yield this.customQuery(query);
            const returnedData = result;
            return returnedData.insert_players.returning.map((entry) => entry.id);
        });
    }
    getActiveScrims() {
        return this.get('scrims', { "active": true }, ["discord_channel", "id"]);
    }
    getScrimSignupsWithPlayers(scrimId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      query GetScrimSignupsWithPlayers {
        get_scrim_signups_with_players(args: { scrim_id_search: "${scrimId}" }) {
          scrim_id
          date_time
          team_name
          player_one_id
          player_one_discord_id
          player_one_display_name
          player_one_overstat_link
          player_one_elo
          player_two_id
          player_two_discord_id
          player_two_display_name
          player_two_overstat_link
          player_two_elo
          player_three_id
          player_three_discord_id
          player_three_display_name
          player_three_overstat_link
          player_three_elo
        }
      }
    `;
            const result = yield this.customQuery(query);
            const returnedData = result;
            return returnedData.get_scrim_signups_with_players;
        });
    }
    changeTeamName(scrimId, oldTeamName, newTeamName) {
        return this.update('scrim_signups', { scrim_id: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9", team_name: "Fineapples" }, { team_name: "Dude Cube" }, ["team_name", "player_one_id", "player_two_id", "player_three_id", "scrim_id",]);
    }
    generatePlayerUpdateQuery(player, uniqueQueryName) {
        const overstatSet = player.overstatLink ? `overstat_link: "${player.overstatLink}"` : '';
        const eloSet = player.elo ? `elo: ${player.elo}` : '';
        return `
      update_player_${uniqueQueryName}: update_players(
         where: {discord_id: {_eq: "${player.discordId}"}},
          _set: {
            display_name: "${player.displayName}",
            ${overstatSet}${overstatSet && eloSet ? "," : ""}
            ${eloSet}
          }
        ) {
          affected_rows
        }
    `;
    }
}
exports.DB = DB;
