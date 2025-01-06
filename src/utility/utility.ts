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
