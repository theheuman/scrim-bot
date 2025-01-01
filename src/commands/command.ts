import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { isGuildMember } from "../utility/utility";
import { authService } from "../services";
import {
  CustomInteraction,
  getCustomOptions,
  OptionConfig,
  SlashCommandOption,
} from "./interaction";

export abstract class Command extends SlashCommandBuilder {
  isAdmin: boolean;

  protected constructor(
    name: string,
    description: string,
    isAdmin: boolean = false,
  ) {
    super();
    this.setName(name);
    this.setDescription(description);
    this.isAdmin = isAdmin ?? false;
  }

  addUserInput(name: string, description: string, isRequired: boolean = false) {
    this.addUserOption((option) =>
      this.addOption(option, name, description, isRequired),
    );
  }

  addStringInput(name: string, description: string, config?: OptionConfig) {
    this.addStringOption((baseOption) => {
      const option = this.addOption(
        baseOption,
        name,
        description,
        config?.isRequired ?? false,
      );
      if (config?.minLength) {
        option.setMinLength(config.minLength);
      }
      if (config?.maxLength) {
        option.setMaxLength(config.maxLength);
      }
      return option;
    });
  }

  addNumberInput(
    name: string,
    description: string,
    isRequired: boolean = false,
  ) {
    this.addNumberOption((option) =>
      this.addOption(option, name, description, isRequired),
    );
  }

  addRoleInput(name: string, description: string, isRequired: boolean = false) {
    this.addRoleOption((option) =>
      this.addOption(option, name, description, isRequired),
    );
  }

  // at some point discord might actually implement this, for now just use string
  addDateInput(name: string, description: string, isRequired: boolean = false) {
    this.addStringOption((option) =>
      this.addOption(option, name, description, isRequired)
        .setMinLength(3)
        .setMaxLength(17),
    );
  }

  addOption<T extends SlashCommandOption>(
    option: T,
    name: string,
    description: string,
    isRequired: boolean,
  ): T {
    return option
      .setName(name)
      .setDescription(description)
      .setRequired(isRequired) as T;
  }

  formatDate(date: Date) {
    return `<t:${Math.floor(date.valueOf() / 1000)}:f>`;
  }

  formatTime(date: Date) {
    return `<t:${Math.floor(date.valueOf() / 1000)}:t>`;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (this.isAdmin) {
      if (!isGuildMember(interaction.member)) {
        await interaction.reply(
          "Can't find the member issuing the command or this is an api command, no command executed",
        );
        return;
      } else if (!(await authService.memberIsAdmin(interaction.member))) {
        await interaction.reply("User calling command is not authorized");
        return;
      }
    }
    interaction.options = getCustomOptions(interaction);
    return this.run(interaction as CustomInteraction);
  }

  abstract run(interaction: CustomInteraction): Promise<void>;
}
