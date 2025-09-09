import { Player } from "./Player";

export interface Scrim {
  id: string;
  dateTime: Date;
  discordChannel: string;
  active: boolean;
  overstatId?: string;
}

export interface ScrimSignup {
  teamName: string;
  players: Player[];
  signupId: string;
  signupPlayer: Player;
  prio?: {
    amount: number;
    reasons: string;
  };
  date: Date;
}
