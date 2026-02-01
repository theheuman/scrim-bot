import { commit } from "@huggingface/hub";
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

    const response = await commit({
      credentials: {
        accessToken: this.hfToken,
      },
      repo: {
        type: "dataset",
        name: repoId,
      },
      title: `Upload stats for scrim ${overstatId}. ${dateString}`,
      operations: [
        {
          operation: "addOrUpdate",
          path: filePath,
          content: new Blob([contentString]),
        },
      ],
    });

    return response.commit.url;
  }
}
