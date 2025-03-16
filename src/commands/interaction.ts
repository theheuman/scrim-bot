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
  getDateTime(key: string, required: true): Date;
};

export const getCustomInteraction = (
  interaction: ChatInputCommandInteraction,
): CustomInteraction => {
  const extendedOptions: ExtendedCommandInteractionOptionResolver =
    interaction.options as ExtendedCommandInteractionOptionResolver;

  extendedOptions["getDateTime"] = (key: string): Date => {
    const dateTimeString = interaction.options.getString(key);
    try {
      if (dateTimeString) {
        return parseDate(dateTimeString);
      }
    } catch (e) {
      const errorMessage = `Can't parse "${key}". ${e}; Expected format: mm/dd/yy hh:mm pm`;
      throw Error(errorMessage);
    }
    // get around typescript expecting a date here, technically we are supplying the getDate(): Date | null function here
    return null as unknown as Date;
  };
  const extendedInteraction = interaction as CustomInteraction;
  extendedInteraction.options = extendedOptions;

  extendedInteraction["invisibleReply"] = (message: string) => {
    const replyData: InteractionReplyOptions = {
      content: message,
      ephemeral: true,
    };
    console.log(`Invisible reply to interaction ${interaction.id}: `, message);
    return interaction.reply(replyData);
  };

  /*
   * TODO the following causes infinite loops, how to resolve?
  // @ts-expect-error ts doesn't know what to do with the return types of discords overlapping methods
  extendedInteraction["reply"] = (
    argument: string | MessagePayload | InteractionReplyOptions,
  ) => {
    console.log(`Replying to interaction ${interaction.id}: `, argument);
    return interaction.reply(argument);
  };
  extendedInteraction["editReply"] = (
    argument: string | MessagePayload | InteractionReplyOptions,
  ) => {
    console.log(`Editing reply to interaction ${interaction.id}: `, argument);
    return interaction.editReply(argument);
  };
  extendedInteraction["followUp"] = (
    argument: string | MessagePayload | InteractionReplyOptions,
  ) => {
    console.log(`Following up to interaction ${interaction.id}: `, argument);
    return interaction.followUp(argument);
  };

   */

  return extendedInteraction;
};

export interface CustomInteraction extends ChatInputCommandInteraction {
  options: ExtendedCommandInteractionOptionResolver;
  invisibleReply: (message: string) => Promise<InteractionResponse<boolean>>;
}
