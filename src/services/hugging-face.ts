import { OverstatTournamentResponse } from "../models/overstatModels";
import { Scrim } from "../models/Scrims";

export class HuggingFaceService {
  private hfToken = "some token that will be loaded from config file later";

  constructor() {
    // grab hugging face token from configuration
  }

  async uploadOverstatJson(scrim: Scrim, stats: OverstatTournamentResponse) {
    const repoId = "VESA-apex/apex-scrims";

    const dateString = scrim.dateTime
      .toISOString()
      .split("T")[0]
      .replace("-", "_");
    const filePath = `scrims_${dateString}_id_${scrim.id}.json`;

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
          summary: `Upload stats for scrim ${scrim.id}`,
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
    return data.commitHash;
  }
}
