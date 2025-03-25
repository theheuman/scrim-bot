import { Client, ClientOptions, Collection } from "discord.js";
import { Command } from "./commands/command";

export class ExtendedClient extends Client {
  commands: Collection<string, Command>;

  constructor(options: ClientOptions) {
    super(options);
    this.commands = new Collection();
  }
}
