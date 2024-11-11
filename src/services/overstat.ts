import { OverstatTournamentResponse } from "../models/overstatModels";

export class OverstatService {
  private getUrl(tournamentId: string) {
    return `https://overstat.gg/api/stats/${tournamentId}/overall`;
  }

  private getTournamentId(overstatLink: string): string {
    const url = new URL(overstatLink);
    let tournamentId = undefined;
    try {
      const tournamentName = url.pathname.split("/")[3];
      tournamentId = tournamentName.split(".")[0];
    } catch {
      throw Error(
        "URL Malformated, make sure you are using the fully built url and not the shortcode",
      );
    }
    if (!tournamentId) {
      throw Error(
        "URL Malformated, make sure you are using the fully built url and not the shortcode",
      );
    }
    return tournamentId;
  }

  private getHeaders(): HeadersInit {
    return {
      Accept: "text/plain",
    };
  }

  async getOverallStats(
    overstatLink: string,
  ): Promise<OverstatTournamentResponse> {
    const tournamentId = this.getTournamentId(overstatLink);
    const url = this.getUrl(tournamentId);
    const response = await fetch(url);
    const data = await response.text();
    return JSON.parse(data);
  }
}
