import {
  CacheType,
  ChatInputCommandInteraction,
  CommandInteractionOptionResolver,
  Guild,
  GuildMember,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  InteractionResponse,
  Message,
  MessagePayload,
  SlashCommandChannelOption,
  SlashCommandIntegerOption,
  SlashCommandNumberOption,
  SlashCommandRoleOption,
  SlashCommandStringOption,
  SlashCommandUserOption,
  TextBasedChannel,
  User,
} from "discord.js";
import { parseDate } from "../utility/time";
import { isGuildMember } from "../utility/utility";

export type SlashCommandOption =
  | SlashCommandStringOption
  | SlashCommandNumberOption
  | SlashCommandRoleOption
  | SlashCommandUserOption
  | SlashCommandChannelOption
  | SlashCommandIntegerOption;

export interface StringOptionConfig {
  isRequired?: boolean;
  minLength?: number;
  maxLength?: number;
}

export interface NumberOptionConfig {
  isRequired?: boolean;
  minValue?: number;
  maxValue?: number;
}

type ExtendedCommandInteractionOptionResolver = Omit<
  CommandInteractionOptionResolver<CacheType>,
  "getMessage" | "getFocused"
> & {
  getDateTime(key: string, required?: boolean): Date | null;
  getDateTime(key: string, required: true): Date;
};

export class CustomInteraction {
  ogInteraction: ChatInputCommandInteraction;
  options: ExtendedCommandInteractionOptionResolver;
  member: GuildMember;
  user: User;
  channelId: string;
  channel: TextBasedChannel | null;
  guild: Guild | null;

  constructor(interaction: ChatInputCommandInteraction) {
    this.ogInteraction = interaction;
    if (!isGuildMember(interaction.member)) {
      throw Error("Interaction not triggered by guild member");
    }
    this.member = interaction.member;
    this.user = interaction.user;
    this.channelId = interaction.channelId;
    this.channel = interaction.channel;
    this.guild = interaction.guild;
    this.options = this.getOptionResolver(interaction.options);
  }

  private getOptionResolver(
    options: Omit<
      CommandInteractionOptionResolver<CacheType>,
      "getMessage" | "getFocused"
    >,
  ): ExtendedCommandInteractionOptionResolver {
    const extendedOptions: ExtendedCommandInteractionOptionResolver =
      options as ExtendedCommandInteractionOptionResolver;

    extendedOptions["getDateTime"] = (key: string): Date => {
      const dateTimeString = options.getString(key);
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
    return extendedOptions;
  }

  reply(
    argument: string | MessagePayload | InteractionReplyOptions,
  ): Promise<InteractionResponse<boolean>> {
    console.log(
      `\tReplying to interaction ${this.ogInteraction.id}: `,
      argument,
    );
    return this.ogInteraction.reply(argument);
  }

  editReply(
    argument: string | MessagePayload | InteractionEditReplyOptions,
  ): Promise<Message<boolean>> {
    console.log(
      `\tEditing reply to interaction ${this.ogInteraction.id}: `,
      argument,
    );
    return this.ogInteraction.editReply(argument);
  }

  followUp(
    argument: string | MessagePayload | InteractionReplyOptions,
  ): Promise<Message<boolean>> {
    console.log(
      `\tFollowing up to interaction ${this.ogInteraction.id}: `,
      argument,
    );
    return this.ogInteraction.followUp(argument);
  }

  invisibleReply(message: string): Promise<InteractionResponse<boolean>> {
    const replyData: InteractionReplyOptions = {
      content: message,
      ephemeral: true,
    };
    console.log(
      `\tInvisible reply to interaction ${this.ogInteraction.id}: `,
      message,
    );
    return this.ogInteraction.reply(replyData);
  }

  deleteReply(): Promise<void> {
    return this.ogInteraction.deleteReply();
  }
}
