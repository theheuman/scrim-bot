import { GuildMember, User } from "discord.js";
import { ExpungedPlayerPrio } from "../../src/models/Prio";
import { Scrim, ScrimSignup } from "../../src/models/Scrims";

export class RosterServiceMock {
  async replaceTeammate(
    memberUsingCommand: GuildMember,
    discordChannel: string,
    teamName: string,
    oldUser: User,
    newUser: User,
  ): Promise<void> {
    console.log(
      "Replacing teammate",
      memberUsingCommand,
      discordChannel,
      teamName,
      oldUser,
      newUser,
    );
  }

  async removeSignup(
    memberUsingCommand: GuildMember,
    discordChannel: string,
    teamName: string,
  ): Promise<void> {
    console.log(
      "Removing signup",
      memberUsingCommand,
      discordChannel,
      teamName,
    );
  }

  async changeTeamName(
    memberUsingCommand: GuildMember,
    discordChannel: string,
    oldTeamName: string,
    newTeamName: string,
  ): Promise<void> {
    console.log(
      "changing team name",
      memberUsingCommand,
      discordChannel,
      oldTeamName,
      newTeamName,
    );
  }
}
