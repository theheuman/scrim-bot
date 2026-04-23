import * as fs from "node:fs";
import { MmrService } from "../../src/services/mmr";

jest.mock("node:fs", () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const mockApiData = [
  { nucleusHash: "111111", weighted_overall_contribution: 0.9 },
  { nucleusHash: "222222", weighted_overall_contribution: 0.5 },
  { nucleusHash: "333333", weighted_overall_contribution: 0.1 },
];

const mockApiResponse = {
  status: "success",
  filters: [],
  options: {},
  table: "mmr",
  data: mockApiData,
};

describe("MmrService", () => {
  let service: MmrService;

  beforeEach(() => {
    service = new MmrService();
    global.fetch = jest.fn();
    (fs.readFileSync as jest.Mock).mockClear();
    (fs.writeFileSync as jest.Mock).mockClear();
  });

  describe("getMmrMap()", () => {
    describe("cache hit", () => {
      it("should return map from cache without fetching when cache is fresh", async () => {
        const freshCache = JSON.stringify({
          fetchedAt: new Date().toISOString(),
          data: mockApiData,
        });
        (fs.readFileSync as jest.Mock).mockReturnValue(freshCache);

        const result = await service.getMmrMap();

        expect(global.fetch).not.toHaveBeenCalled();
        expect(result.get("111111")).toBe(0.9);
        expect(result.get("222222")).toBe(0.5);
        expect(result.get("333333")).toBe(0.1);
      });

      it("should skip cache and fetch when forceRefresh is true", async () => {
        const freshCache = JSON.stringify({
          fetchedAt: new Date().toISOString(),
          data: mockApiData,
        });
        (fs.readFileSync as jest.Mock).mockReturnValue(freshCache);
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => mockApiResponse,
        });

        await service.getMmrMap(true);

        expect(global.fetch).toHaveBeenCalledWith(
          "https://vesa.apexapm.com/API/stats/all.php",
        );
      });
    });

    describe("cache miss", () => {
      it("should fetch and write cache when cache file is missing", async () => {
        (fs.readFileSync as jest.Mock).mockImplementation(() => {
          throw new Error("ENOENT");
        });
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => mockApiResponse,
        });

        const result = await service.getMmrMap();

        expect(global.fetch).toHaveBeenCalledWith(
          "https://vesa.apexapm.com/API/stats/all.php",
        );
        expect(fs.writeFileSync).toHaveBeenCalledWith(
          "mmr-cache.json",
          expect.stringContaining('"111111"'),
        );
        expect(result.get("111111")).toBe(0.9);
      });

      it("should fetch and write cache when cache is stale", async () => {
        const staleCache = JSON.stringify({
          fetchedAt: new Date(Date.now() - CACHE_TTL_MS - 1000).toISOString(),
          data: mockApiData,
        });
        (fs.readFileSync as jest.Mock).mockReturnValue(staleCache);
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => mockApiResponse,
        });

        await service.getMmrMap();

        expect(global.fetch).toHaveBeenCalled();
        expect(fs.writeFileSync).toHaveBeenCalled();
      });
    });

    describe("errors", () => {
      it("should throw when API returns a non-ok status", async () => {
        (fs.readFileSync as jest.Mock).mockImplementation(() => {
          throw new Error("ENOENT");
        });
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 503,
        });

        await expect(service.getMmrMap()).rejects.toThrow(
          "MMR API responded with status 503",
        );
      });

      it("should throw when API response data is not an array", async () => {
        (fs.readFileSync as jest.Mock).mockImplementation(() => {
          throw new Error("ENOENT");
        });
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({ status: "error", data: null }),
        });

        await expect(service.getMmrMap()).rejects.toThrow(
          "MMR API returned unexpected shape: status=error",
        );
      });

      it("should not write cache when API returns bad shape", async () => {
        (fs.readFileSync as jest.Mock).mockImplementation(() => {
          throw new Error("ENOENT");
        });
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({ status: "error", data: null }),
        });

        await expect(service.getMmrMap()).rejects.toThrow();
        expect(fs.writeFileSync).not.toHaveBeenCalled();
      });
    });
  });
});
