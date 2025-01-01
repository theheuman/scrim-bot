import {
  CacheType,
  ChatInputCommandInteraction,
  CommandInteractionOptionResolver,
} from "discord.js";
import { parseDate } from "../utility/time";

type ExtendedCommandInteractionOptionResolver = Omit<
  CommandInteractionOptionResolver<CacheType>,
  "getMessage" | "getFocused"
> & {
  getDateTime(key: string, required?: boolean): Date | null;
  // if date can't be parsed,
  getDateTime(key: string, required: true): Date;
};

export const getCustomOptions = (
  interaction: ChatInputCommandInteraction,
): ExtendedCommandInteractionOptionResolver => {
  return {
    ...interaction.options,
    getDateTime: (key: string, required?: boolean): Date => {
      const dateTimeString = interaction.options.getString(key);
      try {
        if (dateTimeString) {
          return parseDate(dateTimeString);
        }
      } catch (e) {
        interaction.reply(
          `Can't parse ${key}. ${required ? "Required. " : ""}${e}; Expected format: mm/dd/yy hh:mm pm`,
        );
        throw Error(
          "Unable to parse a date argument that was " +
            (required ? "required" : "supplied"),
        );
      }
      // get around typescript expecting a date here, technically we are supplying the getDate(): Date | null function here
      return null as unknown as Date;
    },
  };
};

export interface CustomInteraction extends ChatInputCommandInteraction {
  options: ExtendedCommandInteractionOptionResolver;
}
