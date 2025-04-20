import { GuildMember, User } from "discord.js";
import { ScrimSignup } from "../../src/models/Scrims";

export class RosterServiceMock {
  async replaceTeammate(
    memberUsingCommand: GuildMember,
    discordChannel: string,
    teamName: string,
    oldUser: User,
    newUser: User,
  ): Promise<ScrimSignup> {
    console.log(
      "Replacing teammate",
      memberUsingCommand,
      discordChannel,
      teamName,
      oldUser,
      newUser,
    );
    return {} as ScrimSignup;
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
