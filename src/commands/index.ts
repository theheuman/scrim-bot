import { Command } from "./command";
import { AddPrioCommand } from "./admin/prio/add-prio";

// TODO inject services to mock things even easier
export const commands: Command[] = [new AddPrioCommand()];
