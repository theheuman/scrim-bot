import { Channel, ForumChannel, GuildMember } from "discord.js";
import type { APIInteractionGuildMember } from "../../node_modules/discord-api-types/payloads/v10/_interactions/base.d.ts";
import { ChannelType } from "discord-api-types/v10";

export function isGuildMember(
  value: GuildMember | APIInteractionGuildMember | null,
): value is GuildMember {
  return (value as GuildMember)?.roles !== undefined;
}

export function isForumChannel(value: Channel): value is ForumChannel {
  return (value as ForumChannel)?.type === ChannelType.GuildForum;
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
    rosterLockTime: string;
  },
) {
  return text
    .replace("${scrimTime}", replacements.scrimTime)
    .replace("${scrimDate}", replacements.scrimDate)
    .replace("${draftTime}", replacements.draftTime)
    .replace("${lobbyPostTime}", replacements.lobbyPostTime)
    .replace("${lowPrioTime}", replacements.lowPrioTime)
    .replace("${signupCount}", replacements.signupCount)
    .replace("${rosterLockTime}", replacements.rosterLockTime)
    .replace(/\\n/g, "\n");
}
