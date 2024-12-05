import { GuildMember } from "discord.js";
import type { APIInteractionGuildMember } from "../../node_modules/discord-api-types/payloads/v10/_interactions/base.d.ts";

export function isGuildMember(
  value: GuildMember | APIInteractionGuildMember | null,
): value is GuildMember {
  return (value as GuildMember).roles !== undefined;
}
