import { Player } from "./Player";

export enum PrioType {
  regular = "regular",
  off = "off",
  league = "league",
}

export function parsePrioType(value: string): PrioType {
  return Object.values(PrioType).includes(value as PrioType)
    ? (value as PrioType)
    : PrioType.regular;
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
