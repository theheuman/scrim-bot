export interface Player {
  id: string;
  discordId: string;
  displayName: string;
  overstatId?: string;
  elo?: number;
  lowPrio?: number;
}

export interface PlayerInsert {
  discordId: string;
  displayName: string;
  overstatId?: string;
  elo?: number;
}
