import { OverstatService } from "../src/services/overstat";
import { mockOverstatResponse } from "./mocks/overstat-response.mock";
import { User } from "discord.js";
import { Player, PlayerStatInsert } from "../src/models/Player";
import { ScrimSignup } from "../src/models/Scrims";
import { OverstatTournamentResponse } from "../src/models/overstatModels";

describe("Overstat", () => {
  let overstatService: OverstatService;
  const overstatLink =
    "https://overstat.gg/tournament/thevoidesports/9994.The_Void_Scrim_Lobby_1_8pm_11_/standings/overall/scoreboard";

  beforeEach(() => {
    overstatService = new OverstatService();
    global.fetch = jest.fn();
  });

  describe("get overstat data", () => {
    it("Should get data", async () => {
      // Set up mock fetch to resolve with the mock data
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockOverstatResponse,
      });
      const tournamentStats =
        await overstatService.getOverallStats(overstatLink);
      expect(tournamentStats.analytics).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        "https://overstat.gg/api/stats/9994/overall",
      );
    });

    describe("errors", () => {
      it("Should throw can't split error", async () => {
        const causeException = async () => {
          await overstatService.getOverallStats("https://overstat.gg/_7zpee");
        };
        await expect(causeException).rejects.toThrow(
          "URL Malformated, make sure you are using the fully built url and not the shortcode",
        );
      });

      it("Should throw no tournament code error", async () => {
        const causeException = async () => {
          await overstatService.getOverallStats(
            "https://overstat.gg/tournament/thevoidesports/.The_Void_Scrim_Lobby_1_8pm_11_/standings/overall/scoreboard",
          );
        };
        await expect(causeException).rejects.toThrow(
          "URL Malformated no tournament id found, make sure you are using the fully built url and not the shortcode",
        );
      });
    });
  });

  it("Should correctly match player data", () => {
    const zboy: { user: User; player: Player } = {
      user: { id: "0", displayName: "Zboy" } as User,
      player: { discordId: "0", id: "1987254", displayName: "Zboy" },
    };
    const theheuman: Player = {
      discordId: "1",
      id: "123",
      displayName: "TheHeuman",
      overstatId: "357606",
    };
    const revy: Player = {
      discordId: "3",
      id: "4368",
      displayName: "revy2hands",
    };
    const cTreazy: Player = {
      discordId: "4",
      id: "452386",
      displayName: "treazy",
    };

    const fineapples: ScrimSignup = {
      teamName: "Fineapples",
      players: [revy, theheuman, cTreazy],
      signupId: "213",
      signupPlayer: zboy.player,
    };
    const tournamentStats: OverstatTournamentResponse =
      JSON.parse(mockOverstatResponse);
    const playerStats = overstatService.matchPlayers(
      "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
      [fineapples],
      tournamentStats,
    );
    expect(playerStats.length).toEqual(1);
    const theHeumanOverallStats = tournamentStats.teams[9].player_stats[0];
    const expectedStats: PlayerStatInsert = {
      assists: theHeumanOverallStats.assists,
      characters: "newcastle,newcastle,newcastle,newcastle,newcastle,newcastle",
      damage_dealt: theHeumanOverallStats.damageDealt,
      damage_taken: theHeumanOverallStats.damageTaken,
      games_played: 6,
      grenades_thrown: theHeumanOverallStats.grenadesThrown,
      kills: theHeumanOverallStats.kills,
      knockdowns: theHeumanOverallStats.knockdowns,
      name: theHeumanOverallStats.name,
      player_id: "123",
      respawns_given: theHeumanOverallStats.respawnsGiven,
      revives_given: theHeumanOverallStats.revivesGiven,
      score: theHeumanOverallStats.score,
      scrim_id: "ebb385a2-ba18-43b7-b0a3-44f2ff5589b9",
      survival_time: theHeumanOverallStats.survivalTime,
      tacticals_used: theHeumanOverallStats.tacticalsUsed,
      ultimates_used: theHeumanOverallStats.ultimatesUsed,
    };
    expect(playerStats[0]).toEqual(expectedStats);
  });
});
