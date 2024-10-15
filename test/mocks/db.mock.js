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
exports.DbMock = void 0;
const db_1 = require("../../src/db/db");
class DbMock extends db_1.DB {
    constructor() {
        super();
        this.customQueryResponse = {};
        this.deleteResponse = "";
        this.getResponse = {};
        this.postResponse = "";
        this.updateResponse = true;
        this.addScrimSignupResponse = "";
        this.insertPlayersResponse = [""];
        this.insertPlayerIfNotExistsResponse = "";
    }
    customQuery(query) {
        return Promise.resolve(this.customQueryResponse);
    }
    deleteById(tableName, id) {
        return Promise.resolve(this.deleteResponse);
    }
    get(tableName, fieldsToSearch, fieldsToReturn) {
        return Promise.resolve(this.getResponse);
    }
    post(tableName, data) {
        return Promise.resolve(this.postResponse);
    }
    update(tableName, fields) {
        return Promise.resolve(this.updateResponse);
    }
    addScrimSignup(teamName, scrimId, playerId, playerTwoId, playerThreeId, combinedElo = null) {
        return Promise.resolve(this.addScrimSignupResponse);
    }
    insertPlayerIfNotExists(discordId, displayName, overstatLink) {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.resolve(this.insertPlayerIfNotExistsResponse);
        });
    }
    insertPlayers(players) {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.resolve(this.insertPlayersResponse);
        });
    }
    getActiveScrims() {
        return Promise.resolve({
            "scrims": [
                {
                    "id": "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
                    "discord_channel": "something"
                }
            ]
        });
    }
    getScrimSignupsWithPlayers(scrimId) {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.resolve([]);
        });
    }
}
exports.DbMock = DbMock;
