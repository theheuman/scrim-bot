import {
  CacheType,
  ChatInputCommandInteraction,
  CommandInteractionOptionResolver,
  InteractionReplyOptions,
  InteractionResponse,
  SlashCommandChannelOption,
  SlashCommandNumberOption,
  SlashCommandRoleOption,
  SlashCommandStringOption,
  SlashCommandUserOption,
} from "discord.js";
import { parseDate } from "../utility/time";

export type SlashCommandOption =
  | SlashCommandStringOption
  | SlashCommandNumberOption
  | SlashCommandRoleOption
  | SlashCommandUserOption
  | SlashCommandChannelOption;

export interface OptionConfig {
  isRequired?: boolean;
  minLength?: number;
  maxLength?: number;
}

type ExtendedCommandInteractionOptionResolver = Omit<
  CommandInteractionOptionResolver<CacheType>,
  "getMessage" | "getFocused"
> & {
  getDateTime(key: string, required?: boolean): Date | null;
  // if date can't be parsed,
  getDateTime(key: string, required: true): Date;
};

export const getCustomInteraction = (
  interaction: ChatInputCommandInteraction,
): CustomInteraction => {
  const extendedOptions: ExtendedCommandInteractionOptionResolver =
    interaction.options as ExtendedCommandInteractionOptionResolver;

  extendedOptions["getDateTime"] = (key: string, required?: boolean): Date => {
    const dateTimeString = interaction.options.getString(key);
    try {
      if (dateTimeString) {
        return parseDate(dateTimeString);
      }
    } catch (e) {
      const errorMessage = `Can't parse ${key}. ${required ? "Required. " : ""}${e}; Expected format: mm/dd/yy hh:mm pm`
      if (interaction.replied) {
        interaction.editReply(errorMessage)
      } else {
        interaction.reply(errorMessage);
      }
    }
    // get around typescript expecting a date here, technically we are supplying the getDate(): Date | null function here
    return null as unknown as Date;
  };
  const extendedInteraction = interaction as CustomInteraction;
  extendedInteraction["invisibleReply"] = (message: string) => {
    const replyData: InteractionReplyOptions = {
      content: message,
      ephemeral: true,
    };
    return interaction.reply(replyData);
  };
  extendedInteraction.options = extendedOptions;

  return extendedInteraction;
};

export interface CustomInteraction extends ChatInputCommandInteraction {
  options: ExtendedCommandInteractionOptionResolver;
  invisibleReply: (message: string) => Promise<InteractionResponse<boolean>>;
}
