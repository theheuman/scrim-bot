import { commit, listFiles } from "@huggingface/hub";
import { appConfig } from "../config";
import { OverstatTournamentResponse } from "../models/overstatModels";
import { Agent, fetch as undiciFetch } from "undici";

// custom agent with longer timeout
const dispatcher = new Agent({
  connect: { timeout: 30000 },
  headersTimeout: 30000,
});

const customFetch = (url: URL | RequestInfo, init?: RequestInit) => {
  return undiciFetch(url as Parameters<typeof undiciFetch>[0], {
    ...(init as Parameters<typeof undiciFetch>[1] | undefined),
    dispatcher,
  }) as unknown as Promise<Response>;
};

export class HuggingFaceService {
  private hfToken = appConfig.huggingFaceToken;
  private readonly REPO_ID = "VESA-apex/apex-scrims";

  constructor() {}

  async listFiles(): Promise<string[]> {
    const files = listFiles({
      repo: {
        type: "dataset",
        name: this.REPO_ID,
      },
      credentials: {
        accessToken: this.hfToken,
      },
      fetch: customFetch,
    });
    const filePaths: string[] = [];
    for await (const file of files) {
      if (
        file.type === "file" &&
        file.path.endsWith(".json") &&
        file.path.startsWith("scrim_")
      ) {
        filePaths.push(file.path);
      }
    }
    return filePaths;
  }

  async downloadFile(path: string): Promise<OverstatTournamentResponse> {
    const url = `https://huggingface.co/datasets/${this.REPO_ID}/resolve/main/${path}`;
    const response = await customFetch(url, {
      headers: {
        Authorization: `Bearer ${this.hfToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to download file ${path}: ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data as OverstatTournamentResponse;
  }

  // throws if upload fails, returns the file url on success
  async uploadOverstatJson(
    overstatId: string,
    dateTime: Date,
    stats: OverstatTournamentResponse,
  ): Promise<string> {
    const dateString = dateTime
      .toISOString()
      .split("T")[0]
      .replace("-", "_")
      .replace("-", "_");
    const filePath = `scrims_${dateString}_id_${overstatId}.json`;

    const contentString = JSON.stringify(stats, null, 2);

    await commit({
      credentials: {
        accessToken: this.hfToken,
      },
      repo: {
        type: "dataset",
        name: this.REPO_ID,
      },
      title: `Upload stats for scrim ${overstatId}. ${dateString}`,
      operations: [
        {
          operation: "addOrUpdate",
          path: filePath,
          content: new Blob([contentString]),
        },
      ],
      fetch: customFetch,
    });

    return `https://huggingface.co/datasets/${this.REPO_ID}/blob/main/${filePath}`;
  }
}
