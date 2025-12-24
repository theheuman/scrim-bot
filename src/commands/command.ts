import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import {
  CustomInteraction,
  StringOptionConfig,
  SlashCommandOption,
  NumberOptionConfig,
} from "./interaction";
import { AuthService } from "../services/auth";
import { ApplicationCommandOptionAllowedChannelTypes } from "@discordjs/builders";
import { formatDateForDiscord, formatTimeForDiscord } from "../utility/time";

export abstract class Command extends SlashCommandBuilder {
  private loggableArguments: {
    methodName: keyof ChatInputCommandInteraction["options"];
    name: string;
    required: boolean;
  }[] = [];

  protected constructor(name: string, description: string) {
    super();
    this.setName(name);
    this.setDescription(description);
  }

  addUserInput(name: string, description: string, isRequired: boolean = false) {
    this.addUserOption((option) =>
      this.addOption(option, name, description, isRequired),
    );
    this.loggableArguments.push({
      required: isRequired,
      name,
      methodName: "getUser",
    });
  }

  addStringInput(
    name: string,
    description: string,
    config?: StringOptionConfig,
  ) {
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
    this.loggableArguments.push({
      required: config?.isRequired ?? false,
      name,
      methodName: "getString",
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
    this.loggableArguments.push({
      required: isRequired,
      name,
      methodName: "getNumber",
    });
  }

  addIntegerInput(
    name: string,
    description: string,
    config?: NumberOptionConfig,
  ) {
    this.addIntegerOption((baseOption) => {
      const option = this.addOption(
        baseOption,
        name,
        description,
        config?.isRequired ?? false,
      );
      if (config?.minValue) {
        option.setMinValue(config.minValue);
      }
      if (config?.maxValue) {
        option.setMaxValue(config.maxValue);
      }
      return option;
    });
    this.loggableArguments.push({
      required: config?.isRequired ?? false,
      name,
      methodName: "getInteger",
    });
  }

  addRoleInput(name: string, description: string, isRequired: boolean = false) {
    this.addRoleOption((option) =>
      this.addOption(option, name, description, isRequired),
    );
    this.loggableArguments.push({
      required: isRequired,
      name,
      methodName: "getRole",
    });
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
    this.loggableArguments.push({
      required: config.isRequired ?? false,
      name,
      methodName: "getChannel",
    });
  }

  // at some point discord might actually implement this, for now just use string
  addDateInput(name: string, description: string, isRequired: boolean = false) {
    this.addStringOption((option) =>
      this.addOption(option, name, description, isRequired)
        .setMinLength(3)
        .setMaxLength(17),
    );
    this.loggableArguments.push({
      required: isRequired,
      name,
      methodName: "getString",
    });
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

  formatDate(date: Date): string {
    return formatDateForDiscord(date);
  }

  formatTime(date: Date): string {
    return formatTimeForDiscord(date);
  }

  formatTeam(team: {
    players: {
      discordId: string;
    }[];
    teamName: string;
    signupPlayer: { discordId: string };
    prio?: {
      amount: number;
      reasons: string;
    };
  }): string {
    const playerString = team.players
      .map((player) => this.formatPlayer(player))
      .join(", ");
    const teamString = `__${team.teamName}__\nSigned up by: ${this.formatPlayer(team.signupPlayer)}.\nPlayers: ${playerString}.`;
    const prioString =
      team.prio && team.prio.reasons
        ? ` Prio: ${team.prio.amount}. ${team.prio.reasons}.`
        : "";
    return teamString + prioString;
  }

  formatPlayer(player: { discordId: string }): string {
    return `<@${player.discordId}>`;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    this.logInteraction(interaction);
    try {
      const customInteraction = new CustomInteraction(interaction);
      await this.childExecute(customInteraction);
    } catch (e) {
      console.error(e);
      await interaction.followUp({
        content: `Error executing ${interaction.commandName}. ` + e,
        ephemeral: true,
      });
    }
  }

  abstract childExecute(interaction: CustomInteraction): Promise<void>;

  private logInteraction(interaction: ChatInputCommandInteraction) {
    const informationArray = [];
    informationArray.push(`Command issued: ${interaction.id}`);
    informationArray.push(`Name: ${this.name}`);
    const userArguments = this.loggableArguments.map((argument) => {
      // @ts-expect-error right now this type isn't indexed correctly, fix when we have internet
      const value = interaction.options[argument.methodName](argument.name);
      return `{ name: ${argument.name}, required: ${argument.required}, value: ${value}}`;
    });
    const userArgumentString =
      userArguments.length > 0 ? userArguments.join(", ") : "None";
    informationArray.push(
      `Member: ${interaction.user?.username}, ${interaction.user?.id}`,
    );
    informationArray.push(`Sent at: ${new Date(interaction.createdTimestamp)}`);
    informationArray.push(`User arguments: ${userArgumentString}`);

    console.log(informationArray.join("\n\t"));
  }
}

export abstract class AdminCommand extends Command {
  constructor(
    protected authService: AuthService,
    name: string,
    description: string,
  ) {
    super(name, description);
  }

  async childExecute(interaction: CustomInteraction) {
    await interaction.invisibleReply("Checking if user is authorized");
    if (!(await this.authService.memberIsAdmin(interaction.member))) {
      await interaction.editReply("User calling command is not authorized");
      return;
    }
    await this.run(interaction);
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
