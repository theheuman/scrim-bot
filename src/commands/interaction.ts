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
  getDate(key: string, required?: boolean): Date | null;
  // if date can't be parsed,
  getDate(key: string, required: true): Date;
};

export const getCustomOptions = (
  interaction: ChatInputCommandInteraction,
): ExtendedCommandInteractionOptionResolver => {
  return {
    ...interaction.options,
    getDate: (key: string, required?: boolean): Date => {
      const dateString = interaction.options.getString(key);
      try {
        if (dateString) {
          return parseDate(dateString, "12 am");
        }
      } catch (e) {
        interaction.reply(
          `Can't parse ${key}. Required: ${required ?? false}. ${e}`,
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
