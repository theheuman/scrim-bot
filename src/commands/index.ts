import { Command } from "./command";
import { AddPrioCommand } from "./admin/prio/add-prio";
import { PingCommand } from "./utility/ping";
import { UserCommand } from "./utility/user";
import { ExpungePrioCommand } from "./admin/prio/expunge-prio";
import { AddAdminRoleCommand } from "./admin/roles/add-admin-role";
import { RemoveAdminRoleCommand } from "./admin/roles/remove-admin-role";
import { CloseScrimCommand } from "./admin/scrim-crud/close-scrim";
import { CreateScrimCommand } from "./admin/scrim-crud/create-scrim";
import { GetSignupsCommand } from "./admin/scrim-crud/get-signups";
import { ComputeScrimCommand } from "./admin/scrim-crud/compute-scrim";
import { ChangeTeamNameCommand } from "./signup/change-team-name";
import { DropoutCommand } from "./signup/droput-scrims";
import { SignupCommand } from "./signup/sign-up";
import { SubPlayerCommand } from "./signup/sub-player";
import {
  authService,
  overstatService,
  prioService,
  rosterService,
  signupsService,
  staticValueService,
} from "../services";
import { LinkOverstatCommand } from "./overstat/link-overstat";
import { GetOverstatCommand } from "./overstat/get-overstat";

export const commands: Command[] = [
  // test commands
  new PingCommand(),
  new UserCommand(),

  // custom commands
  new AddPrioCommand(authService, prioService),
  new ExpungePrioCommand(authService, prioService),

  new AddAdminRoleCommand(authService),
  new RemoveAdminRoleCommand(authService),

  new CreateScrimCommand(authService, signupsService, staticValueService),
  new GetSignupsCommand(authService, signupsService, staticValueService),
  new ComputeScrimCommand(authService, signupsService),
  new CloseScrimCommand(authService, signupsService),

  new ChangeTeamNameCommand(rosterService),
  new DropoutCommand(rosterService),
  new SignupCommand(signupsService),
  new SubPlayerCommand(rosterService),

  new LinkOverstatCommand(authService, overstatService),
  new GetOverstatCommand(authService, overstatService),
];
