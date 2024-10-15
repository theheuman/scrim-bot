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
const signups_1 = require("../src/models/signups");
const db_mock_1 = require("./mocks/db.mock");
describe("Signups", () => {
    let dbMock;
    let signups;
    beforeEach(() => {
        dbMock = new db_mock_1.DbMock();
        signups = new signups_1.ScrimSignups(dbMock);
    });
    const theheuman = { id: "123", displayName: "TheHeuman" };
    const zboy = { id: "456", displayName: "Zboy" };
    const supreme = { id: "789", displayName: "Supreme" };
    const revy = { id: "4368", displayName: "revy2hands" };
    const cTreazy = { id: "452386", displayName: "treazy" };
    const mikey = { id: "32576", displayName: "//baev" };
    describe("addTeam()", () => {
        it("Should add a team", () => __awaiter(void 0, void 0, void 0, function* () {
            const expectedSignup = { teamName: "Fineapples", scrimId: "32451", signupId: "4685" };
            signups.activeScrimSignups.set("32451", []);
            jest.spyOn(dbMock, 'insertPlayers').mockImplementation((players) => {
                const expected = [
                    { discordId: "123", displayName: "TheHeuman" },
                    { discordId: "456", displayName: "Zboy" },
                    { discordId: "789", displayName: "Supreme" },
                ];
                expect(players).toEqual(expected);
                return Promise.resolve(["111", "444", "777"]);
            });
            jest.spyOn(dbMock, 'addScrimSignup').mockImplementation((teamName, scrimId, playerId, playerIdTwo, playerIdThree) => {
                expect(teamName).toEqual(expectedSignup.teamName);
                expect(scrimId).toEqual(expectedSignup.scrimId);
                expect(playerId).toEqual("111");
                expect(playerIdTwo).toEqual("444");
                expect(playerIdThree).toEqual("777");
                return Promise.resolve(expectedSignup.signupId);
            });
            const signupId = yield signups.addTeam(expectedSignup.scrimId, expectedSignup.teamName, [theheuman, zboy, supreme]);
            expect(signupId).toEqual(expectedSignup.signupId);
            expect.assertions(7);
        }));
        it("Should not add a team because there is no scrim with that id", () => __awaiter(void 0, void 0, void 0, function* () {
            const causeException = () => __awaiter(void 0, void 0, void 0, function* () {
                yield signups.addTeam("", "", []);
            });
            yield expect(causeException).rejects.toThrow("No active scrim with that scrim id");
        }));
        it("Should not add a team because duplicate team name", () => __awaiter(void 0, void 0, void 0, function* () {
            signups.activeScrimSignups.set("scrim 1", []);
            const causeException = () => __awaiter(void 0, void 0, void 0, function* () {
                yield signups.addTeam("scrim 1", "Fineapples", [zboy, supreme, mikey]);
            });
            yield signups.addTeam("scrim 1", "Fineapples", [theheuman, revy, cTreazy]);
            yield expect(causeException).rejects.toThrow("Duplicate team name");
        }));
        it("Should not add a team because duplicate player", () => __awaiter(void 0, void 0, void 0, function* () {
            signups.activeScrimSignups.set("scrim 1", []);
            const causeException = () => __awaiter(void 0, void 0, void 0, function* () {
                yield signups.addTeam("scrim 1", "Dude Cube", [theheuman, supreme, mikey]);
            });
            yield signups.addTeam("scrim 1", "Fineapples", [theheuman, revy, cTreazy]);
            yield expect(causeException).rejects.toThrow("Player already signed up on different team: TheHeuman <@123> on team Fineapples");
        }));
        it("Should not add a team because there aren't three players", () => __awaiter(void 0, void 0, void 0, function* () {
            signups.activeScrimSignups.set("32451", []);
            const causeException = () => __awaiter(void 0, void 0, void 0, function* () {
                yield signups.addTeam("32451", "", []);
            });
            yield expect(causeException).rejects.toThrow("Exactly three players must be provided");
        }));
        it("Should not add a team because there are 2 of the same player on a team", () => __awaiter(void 0, void 0, void 0, function* () {
            signups.activeScrimSignups.set("scrim 1", []);
            const causeException = () => __awaiter(void 0, void 0, void 0, function* () {
                yield signups.addTeam("scrim 1", "Fineapples", [supreme, supreme, mikey]);
            });
            yield expect(causeException).rejects.toThrow("");
        }));
    });
    describe("getSignups()", () => {
        it("Should get all teams", () => __awaiter(void 0, void 0, void 0, function* () {
            const theheuman = { id: "123", displayName: "TheHeuman" };
            const zboy = { id: "456", displayName: "Zboy" };
            const supreme = { id: "789", displayName: "Supreme" };
            const expectedSignup = { teamName: "Fineapples", scrimId: "32451", signupId: "4685" };
            signups.activeScrimSignups.set("32451", []);
            jest.spyOn(dbMock, 'insertPlayers').mockImplementation((players) => {
                const expected = [
                    { discordId: "123", displayName: "TheHeuman" },
                    { discordId: "456", displayName: "Zboy" },
                    { discordId: "789", displayName: "Supreme" },
                ];
                expect(players).toEqual(expected);
                return Promise.resolve(["111", "444", "777"]);
            });
            jest.spyOn(dbMock, 'addScrimSignup').mockImplementation((teamName, scrimId, playerId, playerIdTwo, playerIdThree) => {
                expect(teamName).toEqual(expectedSignup.teamName);
                expect(scrimId).toEqual(expectedSignup.scrimId);
                expect(playerId).toEqual("111");
                expect(playerIdTwo).toEqual("444");
                expect(playerIdThree).toEqual("777");
                return Promise.resolve(expectedSignup.signupId);
            });
            const signupId = yield signups.addTeam(expectedSignup.scrimId, expectedSignup.teamName, [theheuman, zboy, supreme]);
            expect(signupId).toEqual(expectedSignup.signupId);
            expect.assertions(7);
        }));
    });
    describe("updateActiveScrims()", () => {
        it("Should get active scrims", () => __awaiter(void 0, void 0, void 0, function* () {
            signups.activeScrimSignups.clear();
            jest.spyOn(dbMock, 'getActiveScrims').mockImplementation(() => {
                return Promise.resolve({
                    "scrims": [
                        {
                            "id": "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
                            "discord_channel": "something"
                        }
                    ]
                });
            });
            yield signups.updateActiveScrims();
            expect(signups.scrimChannelMap.size).toEqual(1);
            expect(signups.scrimChannelMap.get("something")).toEqual("ebb385a2-ba18-43b7-b0a3-44f2ff5589b9");
        }));
    });
    describe("createScrim()", () => {
        it("Should create scrim", () => __awaiter(void 0, void 0, void 0, function* () {
            const channelId = "a valid id";
            signups.activeScrimSignups.clear();
            signups.scrimChannelMap.clear();
            jest.spyOn(dbMock, 'createNewScrim').mockImplementation((dateTime, discordChannelID, skill) => {
                expect(discordChannelID).toEqual(channelId);
                expect(skill).toEqual(1);
                return Promise.resolve("a valid scrim id");
            });
            yield signups.createScrim(channelId, new Date());
            expect(signups.activeScrimSignups.size).toEqual(1);
            expect(signups.scrimChannelMap.get(channelId)).toEqual("a valid scrim id");
            expect.assertions(4);
        }));
    });
});
