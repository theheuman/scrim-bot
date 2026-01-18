import { Command } from "./command";
import { AddPrioCommand } from "./scrims/admin/prio/add-prio";
import { PingCommand } from "./utility/ping";
import { UserCommand } from "./utility/user";
import { ExpungePrioCommand } from "./scrims/admin/prio/expunge-prio";
import { AddAdminRoleCommand } from "./scrims/admin/roles/add-admin-role";
import { RemoveAdminRoleCommand } from "./scrims/admin/roles/remove-admin-role";
import { CloseScrimCommand } from "./scrims/admin/scrim-crud/close-scrim";
import { CreateScrimCommand } from "./scrims/admin/scrim-crud/create-scrim";
import { GetSignupsCommand } from "./scrims/admin/scrim-crud/get-signups";
import { ComputeScrimCommand } from "./scrims/admin/scrim-crud/compute-scrim";
import { ChangeTeamNameCommand } from "./scrims/signup/change-team-name";
import { DropoutCommand } from "./scrims/signup/droput-scrims";
import { SignupCommand } from "./scrims/signup/sign-up";
import { SubPlayerCommand } from "./scrims/signup/sub-player";
import {
  authService,
  overstatService,
  prioService,
  rosterService,
  signupsService,
  staticValueService,
  banService,
} from "../services";
import { LinkOverstatCommand } from "./overstat/link-overstat";
import { GetOverstatCommand } from "./overstat/get-overstat";
import { CurrentPositionCommand } from "./scrims/signup/current-position";
import { ScrimBanCommand } from "./scrims/admin/bans/scrim-ban";
import { ExpungeBanCommand } from "./scrims/admin/bans/expunge-ban";
import { LeagueSignupCommand } from "./league/league-signup";
import { GetUserCommand } from "./overstat/get-user";
import { RoleAssignmentCommand } from "./league/admin/role-assign";

export const commonCommands: Command[] = [
  // test commands
  new PingCommand(),
  new UserCommand(),

  new AddAdminRoleCommand(authService),
  new RemoveAdminRoleCommand(authService),

  new LinkOverstatCommand(authService, overstatService),
  new GetOverstatCommand(authService, overstatService),
  new GetUserCommand(authService, overstatService),
];

export const scrimCommands: Command[] = [
  new AddPrioCommand(authService, prioService),
  new ExpungePrioCommand(authService, prioService),

  new ScrimBanCommand(authService, banService),
  new ExpungeBanCommand(authService, banService),

  new CreateScrimCommand(authService, signupsService, staticValueService),
  new GetSignupsCommand(authService, signupsService, staticValueService),
  new ComputeScrimCommand(authService, signupsService),
  new CloseScrimCommand(authService, signupsService),

  new ChangeTeamNameCommand(rosterService),
  new DropoutCommand(rosterService),
  new SignupCommand(signupsService, prioService),
  new SubPlayerCommand(rosterService),
  new CurrentPositionCommand(signupsService, staticValueService),
];

export const leagueCommands: Command[] = [
  new LeagueSignupCommand(overstatService),

  new RoleAssignmentCommand(authService),
];

export const commands: Command[] = [
  ...commonCommands,
  ...scrimCommands,
  ...leagueCommands,
];
