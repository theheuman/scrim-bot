import { Player } from "./Player";

export enum PrioType {
  regular = "regular",
  off = "off",
  league = "league",
}

export interface Scrim {
  id: string;
  dateTime: Date;
  discordChannel: string;
  active: boolean;
  overstatId?: string;
  prioType: PrioType;
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
