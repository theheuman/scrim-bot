import { User } from "discord.js";
import { OverstatService } from "../../services/overstat";

export class LeagueCommandHelper {
  // throws if provided link is illegal or if provided link does not match link for that user in db, otherwise returns valid link, if "none" provided attempts to fetch from db. Sends undefined if it can't fetch it
  static async VALIDATE_OVERSTAT_LINK(
    user: User,
    overstatLink: string,
    overstatService: OverstatService,
  ): Promise<string | undefined> {
    let linkToReturn: string | undefined;
    if (overstatLink.toLowerCase() === "none") {
      try {
        linkToReturn = await overstatService.getPlayerOverstat(user);
      } catch {
        linkToReturn = undefined;
        console.log(
          "No overstat provided and none found in db for " + user.displayName,
        );
      }
    } else {
      // will throw an error if link is invalid
      overstatService.validateLinkUrl(overstatLink);
      let dbOverstatLink;
      try {
        dbOverstatLink = await overstatService.getPlayerOverstat(user);
      } catch {
        await overstatService.addPlayerOverstatLink(user, overstatLink);
      }
      if (
        dbOverstatLink &&
        overstatService.getPlayerId(overstatLink) !==
          overstatService.getPlayerId(dbOverstatLink)
      ) {
        throw new Error(
          `Overstat provided for ${user.displayName} does not match link previously provided with /link-overstat command`,
        );
      }
      linkToReturn = overstatLink;
    }
    return linkToReturn;
  }
}
