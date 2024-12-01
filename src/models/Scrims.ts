import { Player } from "./Player";

export interface Scrim {
  id: string;
  dateTime: Date;
  skill?: number;
  overstatLink?: string;
  discordChannel: string;
  active: boolean;
}

export interface ScrimSignup {
  teamName: string;
  players: Player[];
  signupId: string;
  signupPlayer: Player;
  prio?: number;
}
