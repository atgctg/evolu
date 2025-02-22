import { Config } from "./types.js";

const defaultConfig: Config = {
  syncUrl: "https://bold-frost-4029.fly.dev",
  maxDrift: 60000,
  reloadUrl: "/",
};

export const createConfig = (config?: Partial<Config>): Config => ({
  ...defaultConfig,
  ...config,
});
