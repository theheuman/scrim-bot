import { Command } from "./command";
import { AddPrioCommand } from "./admin/prio/add-prio";
import { ServerInfoCommand } from "./utility/server";
import { PingCommand } from "./utility/ping";
import { UserCommand } from "./utility/user";

// TODO inject services to mock things even easier
export const commands: Command[] = [
  // test commands
  new ServerInfoCommand(),
  new PingCommand(),
  new UserCommand(),

  // custom commands
  new AddPrioCommand(),
];
