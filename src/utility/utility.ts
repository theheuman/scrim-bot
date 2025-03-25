import { Channel, ForumChannel, GuildMember } from "discord.js";
import type { APIInteractionGuildMember } from "../../node_modules/discord-api-types/payloads/v10/_interactions/base.d.ts";
import { ChannelType } from "discord-api-types/v10";
import { Scrim } from "../models/Scrims";
import { formatDateForDiscord, formatTimeForDiscord } from "./time";

export function isGuildMember(
  value: GuildMember | APIInteractionGuildMember | null,
): value is GuildMember {
  return (value as GuildMember)?.roles !== undefined;
}

export function isForumChannel(value: Channel): value is ForumChannel {
  return (value as ForumChannel)?.type === ChannelType.GuildForum;
}

export function getScrimInfoTimes(scrimDate: Date): {
  lobbyPostDate: Date;
  lowPrioDate: Date;
  draftDate: Date;
} {
  const lobbyPostDate = new Date(scrimDate.valueOf());
  // 2 hours before
  lobbyPostDate.setTime(lobbyPostDate.valueOf() - 2 * 60 * 60 * 1000);

  const lowPrioDate = new Date(scrimDate.valueOf());
  // 1.5 hours before
  lowPrioDate.setTime(lowPrioDate.valueOf() - 1.5 * 60 * 60 * 1000);

  const draftDate = new Date(scrimDate.valueOf());
  // 20 minutes before
  draftDate.setTime(draftDate.valueOf() - 20 * 60 * 1000);

  return { lobbyPostDate, lowPrioDate, draftDate };
}

export function replaceScrimVariables(
  text: string,
  replacements: {
    scrimTime: string;
    scrimDate: string;
    draftTime: string;
    lobbyPostTime: string;
    lowPrioTime: string;
    signupCount: string;
  },
) {
  return text
    .replace("${scrimTime}", replacements.scrimTime)
    .replace("${scrimDate}", replacements.scrimDate)
    .replace("${draftTime}", replacements.draftTime)
    .replace("${lobbyPostTime}", replacements.lobbyPostTime)
    .replace("${lowPrioTime}", replacements.lowPrioTime)
    .replace("${signupCount}", replacements.signupCount)
    .replace(/\\n/g, "\n");
}

export function replaceScrimVariablesFromScrim(
  text: string,
  scrim: Scrim,
  signupCount: number,
) {
  const { draftDate, lobbyPostDate, lowPrioDate } = getScrimInfoTimes(
    scrim.dateTime,
  );

  return replaceScrimVariables(text, {
    scrimTime: formatTimeForDiscord(scrim.dateTime),
    scrimDate: formatDateForDiscord(scrim.dateTime),
    draftTime: formatTimeForDiscord(draftDate),
    lobbyPostTime: formatTimeForDiscord(lobbyPostDate),
    lowPrioTime: formatTimeForDiscord(lowPrioDate),
    signupCount: signupCount.toString(),
  });
}
