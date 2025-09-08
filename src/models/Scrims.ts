import { Player } from "./Player";

export interface Scrim {
  id: string;
  dateTime: Date;
  overstatId?: string;
  discordChannel: string;
  active: boolean;
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
