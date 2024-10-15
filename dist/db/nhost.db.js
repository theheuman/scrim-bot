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
exports.nhostDb = void 0;
const db_1 = require("./db");
const config_json_1 = __importDefault(require("../../config.json"));
const nhost_js_1 = require("@nhost/nhost-js");
const config = config_json_1.default;
class NhostDb extends db_1.DB {
    // TODO cache values?
    constructor(adminSecret, region, subdomain) {
        super();
        this.nhostClient = new nhost_js_1.NhostClient({
            autoLogin: false,
            subdomain,
            region,
            adminSecret,
        });
    }
    // TODO generate more complicated search queryies, not just _and { _eq }
    static generateSearchStringFromFields(fields) {
        if (!fields) {
            return '';
        }
        const searchStringArray = Object.keys(fields).map((fieldKey) => `{ ${fieldKey}: { _eq: ${NhostDb.createValueString(fields[fieldKey])} } }`);
        return `where: { _and: [${searchStringArray.join(", ")}]}`;
    }
    get(tableName, fieldsToSearch, fieldsToReturn) {
        return __awaiter(this, void 0, void 0, function* () {
            let searchString = NhostDb.generateSearchStringFromFields(fieldsToSearch);
            if (searchString) {
                // only add parentheses if we have something to search with
                searchString = `(${searchString})`;
            }
            const query = `
      query {
        ${tableName}${searchString} {
          ${fieldsToReturn.join('\n          ')}
        }
      }
    `;
            const result = yield this.nhostClient.graphql.request(query);
            if (!result.data || result.error) {
                throw Error("Graph ql error: " + result.error);
            }
            return result.data;
        });
    }
    post(tableName, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const insertName = "insert_" + tableName;
            const objects = Object.keys(data).map((key) => `${key}: ${NhostDb.createValueString(data[key])}`).join(", ");
            const objectsString = `(objects: [{ ${objects} }])`;
            const query = `
      mutation {
        ${insertName}${objectsString} {
          returning {
            id
          }
        }
      }
    `;
            const result = yield this.nhostClient.graphql.request(query);
            if (!result.data || result.error) {
                console.log(query);
                console.log(result.data);
                console.log(result.error);
                throw Error("Graph ql error: " + result.error);
            }
            const returnedData = result.data;
            return returnedData[insertName].returning[0].id;
        });
    }
    // TODO use delete_by_pk field here? Probably more efficient
    deleteById(tableName, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const deleteName = "delete_" + tableName;
            const searchString = `(${NhostDb.generateSearchStringFromFields({ id })})`;
            const query = `
      mutation {
        ${deleteName}${searchString} {
          returning {
            id
          }
        }
      }
    `;
            const result = yield this.nhostClient.graphql.request(query);
            if (!result.data || result.error) {
                throw Error("Graph ql error: " + result.error);
            }
            const returnedData = result.data;
            return returnedData[deleteName].returning[0].id;
        });
    }
    delete(tableName, fieldsToEqual) {
        return __awaiter(this, void 0, void 0, function* () {
            const deleteName = "delete_" + tableName;
            const searchString = `(${NhostDb.generateSearchStringFromFields(fieldsToEqual)})`;
            const query = `
      mutation {
        ${deleteName}${searchString} {
          returning {
            id
          }
        }
      }
    `;
            const result = yield this.nhostClient.graphql.request(query);
            if (!result.data || result.error) {
                throw Error("Graph ql error: " + result.error);
            }
            const returnedData = result.data;
            return returnedData[deleteName].returning[0].id;
        });
    }
    update(tableName, fieldsToEquate, fieldsToUpdate, fieldsToReturn) {
        return __awaiter(this, void 0, void 0, function* () {
            const updateName = "update_" + tableName;
            const searchString = NhostDb.generateSearchStringFromFields(fieldsToEquate);
            const fieldsToUpdateArray = Object.keys(fieldsToUpdate).map((key) => `${key}: ${NhostDb.createValueString(fieldsToUpdate[key])}`);
            const setString = `_set: { ${fieldsToUpdateArray.join(',\n')} }`;
            const query = `
      mutation {
        ${updateName}( ${searchString}, ${setString} ) {
          returning {
            ${fieldsToReturn.join('\n')}
          }
        }
      }
    `;
            const result = yield this.nhostClient.graphql.request(query);
            if (!result.data || result.error) {
                throw Error("Graph ql error: " + result.error);
            }
            const returnedData = result.data;
            return returnedData[updateName].returning[0];
        });
    }
    replaceTeammate(scrimId, teamName, oldPlayerId, newPlayerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      mutation {
  update_scrim_signups_many(
    updates: [
      {
        where: {
          scrim_id: { _eq: "${scrimId}" },
          player_one_id: { _eq: "${oldPlayerId}" }
        },
        _set: { player_one_id: "${newPlayerId}" }
      },
      {
        where: {
          scrim_id: { _eq: "${scrimId}" },
          player_two_id: { _eq: "${oldPlayerId}" }
        },
        _set: { player_two_id: "${newPlayerId}" }
      },
      {
        where: {
          scrim_id: { _eq: "${scrimId}" },
          player_three_id: { _eq: "${oldPlayerId}" }
        },
        _set: { player_three_id: "${newPlayerId}" }
      }
    ]
  ) {
    returning {
      team_name
      player_one_id
      player_two_id
      player_three_id
      scrim_id
    }
  }
}
`;
            const result = yield this.customQuery(query);
            const teamData = result.update_scrim_signups_many.find((returned) => { var _a; return !!((_a = returned.returning[0]) === null || _a === void 0 ? void 0 : _a.team_name); });
            if (!(teamData === null || teamData === void 0 ? void 0 : teamData.returning[0])) {
                throw Error("Changes not made");
            }
            return teamData.returning[0];
        });
    }
    customQuery(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.nhostClient.graphql.request(query);
            if (!result.data || result.error) {
                throw Error("Graph ql error: " + result.error);
            }
            return Promise.resolve(result.data);
        });
    }
    static createValueString(value) {
        if (typeof value === "string") {
            return `"${value}"`;
        }
        else if (value === null) {
            return `null`;
        }
        return `${value}`;
    }
}
exports.nhostDb = new NhostDb(config.nhost.adminSecret, config.nhost.region, config.nhost.subdomain);
