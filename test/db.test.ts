import { nhostDb } from "../src/db/nhost.db";
import { PlayerInsert, PlayerStatInsert } from "../src/models/Player";
import { Scrims } from "../src/db/table.interfaces";

let mockRequest: (query: string) => Promise<object> = jest.fn();

jest.mock("@nhost/nhost-js", () => {
  return {
    NhostClient: jest.fn().mockImplementation(() => {
      return {
        graphql: {
          request: (query: string) => mockRequest(query),
        },
      };
    }),
    ...jest.requireActual,
  };
});
describe("DB connection", () => {
  beforeEach(() => {});

  /*
  it('Should fetch scrims', async ()=> {
    const scrims = await nhostDb.get('scrims', undefined, ['id', 'overstat_link', 'date_field', 'skill'])
    console.log(scrims)
    expect(scrims).toBeDefined()
  })
  */

  describe("get()", () => {
    it("Should have no search fields", async () => {
      mockRequest = (query) => {
        const expected = `
      query {
        players {
          id
          display_name
          overstat_link
        }
      }
    `;
        expect(query).toEqual(expected);
        return Promise.resolve({ data: { scrims: [] } });
      };
      await nhostDb.get("players", undefined, [
        "id",
        "display_name",
        "overstat_link",
      ]);
      expect.assertions(1);
    });

    it("Should have one search field", async () => {
      mockRequest = (query) => {
        const expected = `
      query {
        players(where: { _and: [{ id: { _eq: "f272a11e-5b30-4aea-b596-af2464de59ba" } }]}) {
          id
          display_name
          overstat_link
        }
      }
    `;
        expect(query).toEqual(expected);
        return Promise.resolve({ data: { players: [] } });
      };
      await nhostDb.get(
        "players",
        {
          id: {
            comparator: "eq",
            value: "f272a11e-5b30-4aea-b596-af2464de59ba",
          },
        },
        ["id", "display_name", "overstat_link"],
      );
      expect.assertions(1);
    });

    it("Should have multiple search fields", async () => {
      mockRequest = (query) => {
        const expected = `
      query {
        players(where: { _and: [{ id: { _eq: "f272a11e-5b30-4aea-b596-af2464de59ba" } }, { display_name: { _eq: "TheHeuman" } }]}) {
          id
          display_name
          overstat_link
        }
      }
    `;
        expect(query).toEqual(expected);
        return Promise.resolve({
          data: {
            players: [
              {
                id: "f272a11e-5b30-4aea-b596-af2464de59ba",
                display_name: "TheHeuman",
                overstat_link:
                  "https://overstat.gg/player/357606.TheHeuman/overview",
              },
            ],
          },
        });
      };

      const data = await nhostDb.get(
        "players",
        {
          id: {
            comparator: "eq",
            value: "f272a11e-5b30-4aea-b596-af2464de59ba",
          },
          display_name: { comparator: "eq", value: "TheHeuman" },
        },
        ["id", "display_name", "overstat_link"],
      );
      expect(data).toEqual({
        players: [
          {
            id: "f272a11e-5b30-4aea-b596-af2464de59ba",
            display_name: "TheHeuman",
            overstat_link:
              "https://overstat.gg/player/357606.TheHeuman/overview",
          },
        ],
      });
      expect.assertions(2);
    });

    it("Should get active scrims", async () => {
      mockRequest = (query) => {
        const expected = `
      query {
        scrims(where: { _and: [{ active: { _eq: true } }]}) {
          discord_channel
          id
        }
      }
    `;
        expect(query).toEqual(expected);
        return Promise.resolve({
          data: {
            scrims: [
              {
                id: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
                discord_channel: "something",
              },
            ],
          },
        });
      };

      (await nhostDb.get(
        "scrims",
        { active: { comparator: "eq", value: true } },
        ["discord_channel", "id"],
      )) as { scrims: Partial<Scrims>[] };
      expect.assertions(1);
    });
  });

  describe("post()", () => {
    it("Should have correct post query", async () => {
      mockRequest = (query) => {
        const expected = `
      mutation {
        insert_players(objects: [{ display_name: "Supreme", discord_id: "244307424838811648" }]) {
          returning {
            id
          }
        }
      }
    `;
        expect(query).toEqual(expected);
        return Promise.resolve({
          data: {
            insert_players: {
              returning: [
                {
                  id: "7605b2bf-1875-4415-a04b-75fe47768565",
                },
              ],
            },
          },
        });
      };
      const newID = await nhostDb.post("players", [
        {
          display_name: "Supreme",
          discord_id: "244307424838811648",
        },
      ]);
      expect(newID).toEqual(["7605b2bf-1875-4415-a04b-75fe47768565"]);
      expect.assertions(2);
    });
    it("Should have correct post query", async () => {
      mockRequest = (query) => {
        const expected = `
      mutation {
        insert_players(objects: [{ display_name: "Supreme", discord_id: "244307424838811648", elo: 1, stats: null }]) {
          returning {
            id
          }
        }
      }
    `;
        expect(query).toEqual(expected);
        return Promise.resolve({
          data: {
            insert_players: {
              returning: [
                {
                  id: "7605b2bf-1875-4415-a04b-75fe47768565",
                },
              ],
            },
          },
        });
      };
      const newID = await nhostDb.post("players", [
        {
          display_name: "Supreme",
          discord_id: "244307424838811648",
          elo: 1,
          stats: null,
        },
      ]);
      expect(newID).toEqual(["7605b2bf-1875-4415-a04b-75fe47768565"]);
      expect.assertions(2);
    });
  });

  describe("update()", () => {
    it("Should have correct update query", async () => {
      mockRequest = (query) => {
        const expected = `
        mutation {
         update_scrim_signups(
           where: { _and: [{ scrim_id: { _eq: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9" } }, { team_name: { _eq: "Fineapples" } }]},
          _set:
          { team_name: "Dude Cube" }
         )
         {
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
        expect(query.replace(/\s+/g, ` `)).toEqual(
          expected.replace(/\s+/g, ` `),
        );
        return Promise.resolve({
          data: {
            update_scrim_signups: {
              returning: [
                {
                  team_name: "Dude Cube",
                  player_one_id: "f272a11e-5b30-4aea-b596-af2464de59ba",
                  player_two_id: "c450684a-d423-4e52-b6ea-0778bf021910",
                  player_three_id: "7605b2bf-1875-4415-a04b-75fe47768565",
                  scrim_id: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
                },
              ],
            },
          },
        });
      };
      const newData = await nhostDb.update(
        "scrim_signups",
        {
          scrim_id: {
            comparator: "eq",
            value: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
          },
          team_name: { comparator: "eq", value: "Fineapples" },
        },
        { team_name: "Dude Cube" },
        [
          "team_name",
          "player_one_id",
          "player_two_id",
          "player_three_id",
          "scrim_id",
        ],
      );
      expect(newData).toEqual({
        team_name: "Dude Cube",
        player_one_id: "f272a11e-5b30-4aea-b596-af2464de59ba",
        player_two_id: "c450684a-d423-4e52-b6ea-0778bf021910",
        player_three_id: "7605b2bf-1875-4415-a04b-75fe47768565",
        scrim_id: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
      });
      expect.assertions(2);
    });
  });

  describe("delete()", () => {
    it("Should have correct delete by unique fields query", async () => {
      mockRequest = (query) => {
        const expected = `
      mutation {
        delete_scrim_signups(where: { _and: [{ scrim_id: { _eq: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9" } }, { team_name: { _eq: "Fineapples" } }]}) {
          returning {
            id
          }
        }
      }
    `;
        expect(query).toEqual(expected);
        return Promise.resolve({
          data: {
            delete_scrim_signups: {
              returning: [
                {
                  id: "6237fd9b-9f72-4748-96fb-620b8e087c1f",
                },
              ],
            },
          },
        });
      };

      const deletedIDs = await nhostDb.delete("scrim_signups", {
        scrim_id: {
          comparator: "eq",
          value: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
        },
        team_name: { comparator: "eq", value: "Fineapples" },
      });
      expect(deletedIDs[0]).toEqual("6237fd9b-9f72-4748-96fb-620b8e087c1f");
      expect.assertions(2);
    });

    it("Should have correct delete by id query", async () => {
      mockRequest = (query) => {
        const expected = `
      mutation {
        delete_players(where: { _and: [{ id: { _eq: "02ac47c9-bde8-4f74-abf6-59b2c534d965" } }]}) {
          returning {
            id
          }
        }
      }
    `;
        expect(query).toEqual(expected);
        return Promise.resolve({
          data: {
            delete_players: {
              returning: [
                {
                  id: "02ac47c9-bde8-4f74-abf6-59b2c534d965",
                },
              ],
            },
          },
        });
      };
      const deletedID = await nhostDb.deleteById(
        "players",
        "02ac47c9-bde8-4f74-abf6-59b2c534d965",
      );
      expect(deletedID).toEqual("02ac47c9-bde8-4f74-abf6-59b2c534d965");
      expect.assertions(2);
    });
  });

  const createPlayer = (
    discordId: string,
    displayName: string,
    overstatId?: string,
    elo?: number,
  ): PlayerInsert => {
    return { discordId, displayName, overstatId: overstatId, elo };
  };
  const zboy = createPlayer("316280734115430403", "zboy", "749174");
  const supreme = createPlayer("244307424838811648", "Supreme", undefined, 1);
  const theheuman = createPlayer("315310843317321732", "TheHeuman", "357606");

  describe("insert player()", () => {
    it("Should have correct mutation query with no overstat link", async () => {
      mockRequest = (query) => {
        const expected = `
      mutation upsertPlayer {
        insert_players_one(
          object: {discord_id: "316280734115430403", display_name: "zboy"}
          on_conflict: {
            constraint: players_discord_id_key,  # Unique constraint on discord_id
            update_columns: [
              display_name
            ]
          }
        ) {
          id  # Return the ID of the player, whether newly inserted or found
        }
      }
    `;
        expect(query).toEqual(expected);
        return Promise.resolve({
          data: {
            insert_players_one: {
              id: "7605b2bf-1875-4415-a04b-75fe47768565",
            },
          },
        });
      };
      const newID = await nhostDb.insertPlayerIfNotExists(
        "316280734115430403",
        "zboy",
      );
      expect(newID).toEqual("7605b2bf-1875-4415-a04b-75fe47768565");
      expect.assertions(2);
    });

    it("Should have correct mutation query with overstat link", async () => {
      mockRequest = (query) => {
        const expected = `
      mutation upsertPlayer {
        insert_players_one(
          object: {discord_id: "316280734115430403", display_name: "zboy", overstat_link: "https://overstat.gg/player/749174.Zboy5z5/overview"}
          on_conflict: {
            constraint: players_discord_id_key,  # Unique constraint on discord_id
            update_columns: [
              display_name
              overstat_link
            ]
          }
        ) {
          id  # Return the ID of the player, whether newly inserted or found
        }
      }
    `;
        expect(query).toEqual(expected);
        return Promise.resolve({
          data: {
            insert_players_one: {
              id: "7605b2bf-1875-4415-a04b-75fe47768565",
            },
          },
        });
      };
      const newID = await nhostDb.insertPlayerIfNotExists(
        "316280734115430403",
        "zboy",
        "https://overstat.gg/player/749174.Zboy5z5/overview",
      );
      expect(newID).toEqual("7605b2bf-1875-4415-a04b-75fe47768565");
      expect.assertions(2);
    });
  });

  describe("insert multiple players", () => {
    it("Should have correct mutation query", async () => {
      mockRequest = (query) => {
        const expected = `
          mutation upsertPlayer {
            insert_players(objects: [
              {discord_id: "316280734115430403", display_name: "zboy"}
              {discord_id: "244307424838811648", display_name: "Supreme"}
              {discord_id: "315310843317321732", display_name: "TheHeuman"}
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

            update_player_1: update_players(
              where: {discord_id: {_eq: "316280734115430403"}},
              _set: {
                display_name: "zboy",
                overstat_id: "749174"
              }
            ) {
              affected_rows
            }

            update_player_2: update_players(
              where: {discord_id: {_eq: "244307424838811648"}},
              _set: {
                display_name: "Supreme",
                elo: 1
              }
            ) {
              affected_rows
            }

            update_player_3: update_players(
              where: {discord_id: {_eq: "315310843317321732"}},
              _set: {
                display_name: "TheHeuman",
                overstat_id: "357606"
              }
            ) {
              affected_rows
            }
          }
        `;
        expect(query.replace(/\s+/g, ` `)).toEqual(
          expected.replace(/\s+/g, ` `),
        );
        return Promise.resolve({
          data: {
            insert_players: {
              returning: [
                {
                  id: "11583f2c-184f-4ab5-9f6f-ff33f2741117",
                },
                {
                  id: "7605b2bf-1875-4415-a04b-75fe47768565",
                },
                {
                  id: "f272a11e-5b30-4aea-b596-af2464de59ba",
                },
              ],
            },
            update_player_1: {
              affected_rows: 1,
            },
            update_player_2: {
              affected_rows: 1,
            },
            update_player_3: {
              affected_rows: 1,
            },
          },
        });
      };
      const newID = await nhostDb.insertPlayers([zboy, supreme, theheuman]);
      expect(newID).toEqual([
        "11583f2c-184f-4ab5-9f6f-ff33f2741117",
        "7605b2bf-1875-4415-a04b-75fe47768565",
        "f272a11e-5b30-4aea-b596-af2464de59ba",
      ]);
      expect.assertions(2);
    });
  });

  describe("replaceTeammate()", () => {
    it("should replace teammate", async () => {
      mockRequest = (query) => {
        const expected = `
      mutation {
  update_scrim_signups_many(
    updates: [
      {
        where: {
          scrim_id: { _eq: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9" },
          player_one_id: { _eq: "11583f2c-184f-4ab5-9f6f-ff33f2741117" },
          _or: [
            { signup_player_id: { _eq: "f272a11e-5b30-4aea-b596-af2464de59ba" } },
            { player_one_id: { _eq: "f272a11e-5b30-4aea-b596-af2464de59ba" } },
            { player_two_id: { _eq: "f272a11e-5b30-4aea-b596-af2464de59ba" } },
            { player_three_id: { _eq: "f272a11e-5b30-4aea-b596-af2464de59ba" } }
          ]
        },
        _set: { player_one_id: "c450684a-d423-4e52-b6ea-0778bf021910" }
      },
      {
        where: {
          scrim_id: { _eq: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9" },
          player_two_id: { _eq: "11583f2c-184f-4ab5-9f6f-ff33f2741117" },
          _or: [
            { signup_player_id: { _eq: "f272a11e-5b30-4aea-b596-af2464de59ba" } },
            { player_one_id: { _eq: "f272a11e-5b30-4aea-b596-af2464de59ba" } },
            { player_two_id: { _eq: "f272a11e-5b30-4aea-b596-af2464de59ba" } },
            { player_three_id: { _eq: "f272a11e-5b30-4aea-b596-af2464de59ba" } }
          ]
        },
        _set: { player_two_id: "c450684a-d423-4e52-b6ea-0778bf021910" }
      },
      {
        where: {
          scrim_id: { _eq: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9" },
          player_three_id: { _eq: "11583f2c-184f-4ab5-9f6f-ff33f2741117" },
          _or: [
            { signup_player_id: { _eq: "f272a11e-5b30-4aea-b596-af2464de59ba" } },
            { player_one_id: { _eq: "f272a11e-5b30-4aea-b596-af2464de59ba" } },
            { player_two_id: { _eq: "f272a11e-5b30-4aea-b596-af2464de59ba" } },
            { player_three_id: { _eq: "f272a11e-5b30-4aea-b596-af2464de59ba" } }
          ]
        },
        _set: { player_three_id: "c450684a-d423-4e52-b6ea-0778bf021910" }
      }
    ]
  ) {
    returning {
      team_name
      signup_player_id
      player_one_id
      player_two_id
      player_three_id
      scrim_id
    }
  }
}
`;
        expect(query).toEqual(expected);
        return Promise.resolve({
          data: {
            update_scrim_signups_many: [
              {
                returning: [],
              },
              {
                returning: [
                  {
                    team_name: "Fineapples",
                    signup_player_id: "f272a11e-5b30-4aea-b596-af2464de59ba",
                    player_one_id: "f272a11e-5b30-4aea-b596-af2464de59ba",
                    player_two_id: "c450684a-d423-4e52-b6ea-0778bf021910",
                    player_three_id: "7605b2bf-1875-4415-a04b-75fe47768565",
                    scrim_id: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
                  },
                ],
              },
              {
                returning: [],
              },
            ],
          },
        });
      };
      const signup = await nhostDb.replaceTeammate(
        "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
        "Fineapples",
        "f272a11e-5b30-4aea-b596-af2464de59ba",
        "11583f2c-184f-4ab5-9f6f-ff33f2741117",
        "c450684a-d423-4e52-b6ea-0778bf021910",
      );
      expect(signup).toEqual({
        team_name: "Fineapples",
        signup_player_id: "f272a11e-5b30-4aea-b596-af2464de59ba",
        player_one_id: "f272a11e-5b30-4aea-b596-af2464de59ba",
        player_two_id: "c450684a-d423-4e52-b6ea-0778bf021910",
        player_three_id: "7605b2bf-1875-4415-a04b-75fe47768565",
        scrim_id: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
      });
      expect.assertions(2);
    });
  });

  describe("changeTeamName()", () => {
    it("should change team name", async () => {
      mockRequest = (query) => {
        const expected = `
      mutation {
  update_scrim_signups(
        where: {
          scrim_id: { _eq: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9" },
          team_name: { _eq: "Dude Cube" },
          _or: [
            { signup_player_id: { _eq: "f272a11e-5b30-4aea-b596-af2464de59ba" } },
            { player_one_id: { _eq: "f272a11e-5b30-4aea-b596-af2464de59ba" } },
            { player_two_id: { _eq: "f272a11e-5b30-4aea-b596-af2464de59ba" } },
            { player_three_id: { _eq: "f272a11e-5b30-4aea-b596-af2464de59ba" } }
          ]
        },
        _set: { team_name: "Can't come up with good team name" }
  ) {
    returning {
      team_name
      signup_player_id
      player_one_id
      player_two_id
      player_three_id
      scrim_id
    }
  }
}
`;
        expect(query.replace(/\s+/g, ` `)).toEqual(
          expected.replace(/\s+/g, ` `),
        );
        return Promise.resolve({
          data: {
            update_scrim_signups_one: {
              returning: [
                {
                  team_name: "Can't come up with good team name",
                  signup_player_id: "f272a11e-5b30-4aea-b596-af2464de59ba",
                  player_one_id: "f272a11e-5b30-4aea-b596-af2464de59ba",
                  player_two_id: "c450684a-d423-4e52-b6ea-0778bf021910",
                  player_three_id: "7605b2bf-1875-4415-a04b-75fe47768565",
                  scrim_id: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
                },
              ],
            },
          },
        });
      };
      const signup = await nhostDb.changeTeamName(
        "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
        "f272a11e-5b30-4aea-b596-af2464de59ba",
        "Dude Cube",
        "Can't come up with good team name",
      );
      expect(signup).toEqual({
        team_name: "Can't come up with good team name",
        signup_player_id: "f272a11e-5b30-4aea-b596-af2464de59ba",
        player_one_id: "f272a11e-5b30-4aea-b596-af2464de59ba",
        player_two_id: "c450684a-d423-4e52-b6ea-0778bf021910",
        player_three_id: "7605b2bf-1875-4415-a04b-75fe47768565",
        scrim_id: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
      });
      expect.assertions(2);
    });
  });

  describe("close and compute scrim", () => {
    const expectedDeleteQuery = `
      mutation {
        delete_scrim_signups(where: { _and: [{ scrim_id: { _eq: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9" } }]}) {
          returning {
            id
          }
        }
      }
    `;
    const expectedPostQuery = `
      mutation {
        insert_scrim_player_stats(objects: [{
  player_id: "f272a11e-5b30-4aea-b596-af2464de59ba",
  scrim_id: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
  assists: 1,
  characters: "fuse,newcastle",
  damage_dealt: 4144,
  damage_taken: 0,
  grenades_thrown: 0,
  kills: 9,
  knockdowns: 9,
  name: "TheHeuman",
  respawns_given: 0,
  revives_given: 2,
  score: 28,
  survival_time: 4222,
  tacticals_used: 0,
  ultimates_used: 0,
  games_played: 6
  }]) {
        returning {
          id
        }
      }
    }
    `;
    it("closeScrim()", async () => {
      mockRequest = (query) => {
        let expected = `
        mutation {
         update_scrims(
           where: { _and: [{ id: { _eq: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9" } }]},
          _set:
          {
            active: false
          }
         )
         {
           returning {
             id
           }
         }
       }
    `;
        let returnData: { data: object } = {
          data: {
            update_scrims: {
              returning: [
                {
                  id: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
                },
              ],
            },
          },
        };
        if (query.includes("delete_")) {
          expected = expectedDeleteQuery;
          returnData = {
            data: {
              delete_scrim_signups: {
                returning: [
                  {
                    id: "7d3bc090-f9aa-4d74-a686-7ab198ab2dfe",
                  },
                  {
                    id: "9766e780-3c13-4298-8eed-a3cf9a206db4",
                  },
                ],
              },
            },
          };
        }
        expect(query.replace(/\s+/g, ` `)).toEqual(
          expected.replace(/\s+/g, ` `),
        );
        return Promise.resolve(returnData);
      };
      const returnedData = await nhostDb.closeScrim(
        "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
      );
      expect(returnedData).toEqual([
        "7d3bc090-f9aa-4d74-a686-7ab198ab2dfe",
        "9766e780-3c13-4298-8eed-a3cf9a206db4",
      ]);
      expect.assertions(3);
    });

    it("computeStats()", async () => {
      mockRequest = (query) => {
        let expected = `
        mutation {
         update_scrims(
           where: { _and: [{ id: { _eq: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9" } }]},
          _set:
          {
            skill: 1,
            overstat_link: "https://overstat.gg/tournament/thevoidesports/10144.The_Void_S1_II_Celestial_Leagu/standings/overall/scoreboard"
          }
         )
         {
           returning {
             id
           }
         }
       }
    `;
        let returnData: { data: object } = {
          data: {
            update_scrims: {
              returning: [
                {
                  id: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
                },
              ],
            },
          },
        };
        if (query.includes("insert_")) {
          expected = expectedPostQuery;
          returnData = {
            data: {
              insert_scrim_player_stats: {
                returning: [
                  {
                    id: "87e7f005-4416-4033-958a-6ddd2f82b16f",
                  },
                ],
              },
            },
          };
        }

        expect(query.replace(/\s+/g, ` `)).toEqual(
          expected.replace(/\s+/g, ` `),
        );
        return Promise.resolve(returnData);
      };
      const theHeumanPlayerStats: PlayerStatInsert = {
        player_id: "f272a11e-5b30-4aea-b596-af2464de59ba",
        scrim_id: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
        assists: 1,
        characters: "fuse,newcastle",
        damage_dealt: 4144,
        damage_taken: 0,
        grenades_thrown: 0,
        kills: 9,
        knockdowns: 9,
        name: "TheHeuman",
        respawns_given: 0,
        revives_given: 2,
        score: 28,
        survival_time: 4222,
        tacticals_used: 0,
        ultimates_used: 0,
        games_played: 6,
      };
      const returnedData = await nhostDb.computeScrim(
        "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
        "https://overstat.gg/tournament/thevoidesports/10144.The_Void_S1_II_Celestial_Leagu/standings/overall/scoreboard",
        1,
        [theHeumanPlayerStats],
      );
      expect(returnedData).toEqual(["87e7f005-4416-4033-958a-6ddd2f82b16f"]);
      expect.assertions(3);
    });
  });

  it("Should set prio", async () => {
    const startDate = new Date();
    const endDate = new Date();
    const amount = -400;
    const reason = "Keeps typing random stuff in chat";
    mockRequest = (query) => {
      const expected = `
      mutation {
        insert_prio(objects: [{ player_id: "c79f4607-2343-465a-94e4-f99e63ab7602", start_date: "${startDate.toISOString()}", end_date: "${endDate.toISOString()}", amount: -400, reason: "${reason}" }]) {
          returning {
            id
          }
        }
      }
    `;
      expect(query).toEqual(expected);
      return Promise.resolve({
        data: {
          insert_prio: {
            returning: [
              {
                id: "7605b2bf-1875-4415-a04b-75fe47768565",
              },
            ],
          },
        },
      });
    };
    const newID = await nhostDb.setPrio(
      ["c79f4607-2343-465a-94e4-f99e63ab7602"],
      startDate,
      endDate,
      amount,
      reason,
    );
    expect(newID).toEqual(["7605b2bf-1875-4415-a04b-75fe47768565"]);
    expect.assertions(2);
  });

  it("should get prio", async () => {
    const scrimDate = new Date();
    mockRequest = (query) => {
      const expected = `
      query {
        prio(where: { _and: [{ start_date: { _lte: "${scrimDate.toISOString()}" } }, { end_date: { _gte: "${scrimDate.toISOString()}" } }]}) {
          player_id
          amount
          reason
        }
      }
    `;
      expect(query).toEqual(expected);
      return Promise.resolve({
        data: {
          prio: [
            {
              player_id: "c79f4607-2343-465a-94e4-f99e63ab7602",
              amount: -400,
              reason: "Enemy of the people",
            },
          ],
        },
      });
    };

    const prioPlayers = await nhostDb.getPrio(scrimDate);
    expect(prioPlayers).toEqual([
      {
        id: "c79f4607-2343-465a-94e4-f99e63ab7602",
        amount: -400,
        reason: "Enemy of the people",
      },
    ]);
  });
});
