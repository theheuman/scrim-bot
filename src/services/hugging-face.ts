import { appConfig } from "../config";
import { OverstatTournamentResponse } from "../models/overstatModels";

export class HuggingFaceService {
  private hfToken = appConfig.huggingFaceToken;

  constructor() {}

  // throws if upload fails, returns commit url if successfull
  // todo return url instead?
  async uploadOverstatJson(
    overstatId: string,
    dateTime: Date,
    stats: OverstatTournamentResponse,
  ): Promise<string> {
    const repoId = "VESA-apex/apex-scrims";

    const dateString = dateTime.toISOString().split("T")[0].replace("-", "_");
    const filePath = `fake_scrims_${dateString}_id_${overstatId}.json`;

    const contentString = JSON.stringify(stats, null, 2);
    const base64Content = Buffer.from(contentString).toString("base64");

    const response = await fetch(
      `https://huggingface.co/api/datasets/${repoId}/commit/main`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: `Upload stats for scrim ${overstatId}. ${dateString}`,
          operations: [
            {
              operation: "add",
              path: filePath,
              content: base64Content,
              encoding: "base64",
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `HF API Error: ${errorData.error || response.statusText}`,
      );
    }

    const data = await response.json();
    return data.commitUrl;
  }
}
