import { Command } from "../../src/commands/command";
import { ChatInputCommandInteraction } from "discord.js";

export class MockCommand extends Command {
  constructor(isAdmin: boolean) {
    super("mockcommand", "fake command to test abstract class", isAdmin);
  }

  run(interaction: ChatInputCommandInteraction) {
    console.log("Mock command run called", interaction.member);
    return Promise.resolve();
  }
}
