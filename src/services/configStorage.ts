import { LocalStorage } from "@raycast/api";
import { Configuration } from "../common/types";

const CONFIG_STORAGE_KEY = "lastUsedConfiguration";

export class ConfigStorage {
  static async saveLastUsedConfig(config: Configuration): Promise<void> {
    try {
      await LocalStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error("Failed to save configuration:", error);
    }
  }

  static async loadLastUsedConfig(): Promise<Configuration | null> {
    try {
      const storedConfig = await LocalStorage.getItem<string>(CONFIG_STORAGE_KEY);
      if (storedConfig) {
        return JSON.parse(storedConfig) as Configuration;
      }
    } catch (error) {
      console.error("Failed to load configuration:", error);
    }
    return null;
  }

  static async clearLastUsedConfig(): Promise<void> {
    try {
      await LocalStorage.removeItem(CONFIG_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear configuration:", error);
    }
  }
}
