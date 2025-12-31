import configJson from "../config.json";

export interface AppConfig {
  lobbySize: number;
  discord: {
    token: string;
    clientId: string;
    guildId: {
      scrim: string;
      league: string;
    };
  };
  nhost: { adminSecret: string; subdomain: string; region: string };
}

export interface ConfigFile {
  prod: AppConfig;
  dev: AppConfig;
}

const configFile = configJson as ConfigFile;
export const appConfig: AppConfig =
  process.env.NODE_ENV === "prod" ? configFile.prod : configFile.dev;
