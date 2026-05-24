import { AlertService } from "../services/alert";
import {
  LeagueDataRepository,
  RosterChangeData,
  SignupData,
  SignupResult,
  SubRequestData,
  WriteResult,
} from "./league-data.repository";

/**
 * Mirrors every write to both a primary repository and a shadow repository concurrently.
 *
 * - Primary failure  → the error is rethrown; the command fails as normal.
 * - Shadow failure   → the error is swallowed and reported via AlertService; the command succeeds.
 *
 * Reads (getRosterDiscordIds) are served from the primary only.
 */
export class MirrorLeagueRepository implements LeagueDataRepository {
  constructor(
    private primary: LeagueDataRepository,
    private shadow: LeagueDataRepository,
    private alertService: AlertService,
  ) {}

  async writeSignup(data: SignupData): Promise<SignupResult | null> {
    const [primaryResult, shadowResult] = await Promise.allSettled([
      this.primary.writeSignup(data),
      this.shadow.writeSignup(data),
    ]);

    if (shadowResult.status === "rejected") {
      await this.alertService.error(
        `MirrorLeagueRepository: shadow writeSignup failed: ${shadowResult.reason}`,
      );
    }

    if (primaryResult.status === "rejected") {
      throw primaryResult.reason;
    }

    return primaryResult.value;
  }

  async writeSubRequest(data: SubRequestData): Promise<WriteResult> {
    const [primaryResult, shadowResult] = await Promise.allSettled([
      this.primary.writeSubRequest(data),
      this.shadow.writeSubRequest(data),
    ]);

    if (shadowResult.status === "rejected") {
      await this.alertService.error(
        `MirrorLeagueRepository: shadow writeSubRequest failed: ${shadowResult.reason}`,
      );
    }

    if (primaryResult.status === "rejected") {
      throw primaryResult.reason;
    }

    return primaryResult.value;
  }

  async writeRosterChange(data: RosterChangeData): Promise<WriteResult> {
    const [primaryResult, shadowResult] = await Promise.allSettled([
      this.primary.writeRosterChange(data),
      this.shadow.writeRosterChange(data),
    ]);

    if (shadowResult.status === "rejected") {
      await this.alertService.error(
        `MirrorLeagueRepository: shadow writeRosterChange failed: ${shadowResult.reason}`,
      );
    }

    if (primaryResult.status === "rejected") {
      throw primaryResult.reason;
    }

    return primaryResult.value;
  }

  async getRosterDiscordIds(): Promise<Map<string, string>> {
    return this.primary.getRosterDiscordIds();
  }
}
