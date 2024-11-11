import { OverstatService } from "../src/services/overstat";
import { mockOverstatResponse } from "./mocks/overstat-response.mock";

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

    it("Should throw error", async () => {
      const causeException = async () => {
        await overstatService.getOverallStats("https://overstat.gg/_7zpee");
      };
      await expect(causeException).rejects.toThrow(
        "URL Malformated, make sure you are using the fully built url and not the shortcode",
      );
    });
  });
});
