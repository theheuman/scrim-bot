import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { isGuildMember } from "../utility/utility";
import {
  CustomInteraction,
  getCustomInteraction,
  OptionConfig,
  SlashCommandOption,
} from "./interaction";
import { AuthService } from "../services/auth";
import { ApplicationCommandOptionAllowedChannelTypes } from "@discordjs/builders";
import { ScrimSignup } from "../models/Scrims";
import { Player } from "../models/Player";

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
      methodName: "getUser",
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
    this.logInteraction(interaction);
    try {
      const customInteraction = getCustomInteraction(interaction);
      await this.childExecute(customInteraction);
    } catch (e) {
      console.error(e);
      await interaction.followUp({
        content: `Error executing "${interaction.commandName}. ` + e,
        ephemeral: true,
      });
    }
  }

  abstract childExecute(interaction: CustomInteraction): Promise<void>;

  private logInteraction(interaction: ChatInputCommandInteraction) {
    const informationArray = [];
    informationArray.push("Command issued");
    informationArray.push(`Name and id: ${this.name} ${interaction.id}`);
    const userArguments = this.loggableArguments.map((argument) => ({
      name: argument.name,
      required: argument.required,
      // @ts-expect-error right now this type isn't indexed correctly, fix when we have internet
      value: interaction.options[argument.methodName](argument.name),
    }));
    informationArray.push(`User arguments: ${userArguments.join(", ")}`);
    informationArray.push(`Member: ${interaction.user?.username}`);
    informationArray.push(`Sent at: ${new Date(interaction.createdTimestamp)}`);

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
    if (!isGuildMember(interaction.member)) {
      await interaction.editReply(
        "Can't find the member issuing the command or this is an api command, no command executed",
      );
      return;
    } else if (!(await this.authService.memberIsAdmin(interaction.member))) {
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
