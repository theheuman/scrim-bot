import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { isGuildMember } from "../utility/utility";
import {
  CustomInteraction,
  getCustomOptions,
  OptionConfig,
  SlashCommandOption,
} from "./interaction";
import { AuthService } from "../services/auth";
import { ApplicationCommandOptionAllowedChannelTypes } from "@discordjs/builders";
import { ScrimSignup } from "../models/Scrims";
import { Player } from "../models/Player";

export abstract class Command extends SlashCommandBuilder {
  protected constructor(name: string, description: string) {
    super();
    this.setName(name);
    this.setDescription(description);
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

  addChannelInput(
    name: string,
    description: string,
    config: {
      isRequired: boolean;
      channelTypes: ApplicationCommandOptionAllowedChannelTypes[];
    },
  ) {
    this.addChannelOption((option) => {
      return this.addOption(
        option,
        name,
        description,
        config.isRequired ?? false,
      ).addChannelTypes(config.channelTypes);
    });
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

  formatTeam(team: ScrimSignup) {
    const playerString = team.players
      .map((player) => this.formatPlayer(player))
      .join(" ");
    const teamString = `__${team.teamName}__. Signed up by: ${this.formatPlayer(team.signupPlayer)}. Players: ${playerString}.`;
    const prioString =
      team.prio && team.prio.reasons
        ? ` Prio: ${team.prio.amount}. ${team.prio.reasons}.`
        : "";
    return teamString + prioString;
  }

  formatPlayer(player: Player) {
    return `<@${player.discordId}>`;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    interaction.options = getCustomOptions(interaction);
    return this.childExecute(interaction as CustomInteraction);
  }

  abstract childExecute(interaction: CustomInteraction): Promise<void>;
}

export abstract class AdminCommand extends Command {
  constructor(
    private authService: AuthService,
    name: string,
    description: string,
  ) {
    super(name, description);
  }

  async childExecute(interaction: CustomInteraction) {
    if (!isGuildMember(interaction.member)) {
      await interaction.reply(
        "Can't find the member issuing the command or this is an api command, no command executed",
      );
      return;
    } else if (!(await this.authService.memberIsAdmin(interaction.member))) {
      await interaction.reply("User calling command is not authorized");
      return;
    }
    return this.run(interaction);
  }

  abstract run(interaction: CustomInteraction): Promise<void>;
}

export abstract class MemberCommand extends Command {
  constructor(name: string, description: string) {
    super(name, description);
  }

  async childExecute(interaction: CustomInteraction) {
    return this.run(interaction);
  }

  abstract run(interaction: CustomInteraction): Promise<void>;
}
