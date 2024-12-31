import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { isGuildMember } from "../utility/utility";
import { authService } from "../services";
import { CustomInteraction, getCustomOptions } from "./interaction";

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
      option.setName(name).setDescription(description).setRequired(isRequired),
    );
  }

  addStringInput(
    name: string,
    description: string,
    isRequired: boolean = false,
  ) {
    this.addStringOption((option) =>
      option.setName(name).setDescription(description).setRequired(isRequired),
    );
  }

  addNumberInput(
    name: string,
    description: string,
    isRequired: boolean = false,
  ) {
    this.addNumberOption((option) =>
      option.setName(name).setDescription(description).setRequired(isRequired),
    );
  }

  addRoleInput(name: string, description: string, isRequired: boolean = false) {
    this.addRoleOption((option) =>
      option.setName(name).setDescription(description).setRequired(isRequired),
    );
  }

  // at some point discord might actually implement this, for now just use string
  addDateInput(name: string, description: string, isRequired: boolean = false) {
    this.addStringOption((option) =>
      option.setName(name).setDescription(description).setRequired(isRequired),
    );
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
