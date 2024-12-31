import { GuildMember } from "discord.js";
import type { APIInteractionGuildMember } from "../../node_modules/discord-api-types/payloads/v10/_interactions/base.d.ts";
import { toZonedTime } from "date-fns-tz";

export function isGuildMember(
  value: GuildMember | APIInteractionGuildMember | null,
): value is GuildMember {
  return (value as GuildMember)?.roles !== undefined;
}

// same rules as date.setHours, if you send milli then all the previous arguments must be defined.
export const setEasternHours = (
  date: Date,
  hour: number,
  min?: number,
  sec?: number,
  milli?: number,
): Date => {
  const zonedDate = toZonedTime(date, "America/New_York");
  // For some reason sending undefined is different than not sending anything, thanks JS
  if (milli) {
    zonedDate.setHours(hour, min, sec, milli);
  } else if (sec) {
    zonedDate.setHours(hour, min, sec);
  } else if (min) {
    zonedDate.setHours(hour, min);
  } else {
    zonedDate.setHours(hour);
  }
  return zonedDate;
};
