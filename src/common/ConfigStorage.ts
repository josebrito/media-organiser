import { LocalStorage } from "@raycast/api";
import { Configuration } from "./types";

const LAST_USED_CONFIG_KEY = "lastUsedConfig";

export class ConfigStorage {
  /**
   * Save the last used configuration to local storage
   */
  static async saveLastUsedConfig(config: Configuration): Promise<void> {
    try {
      await LocalStorage.setItem(LAST_USED_CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
      console.error("Failed to save configuration:", error);
      throw new Error("Failed to save configuration");
    }
  }

  /**
   * Load the last used configuration from local storage
   */
  static async loadLastUsedConfig(): Promise<Configuration | null> {
    try {
      const configString = await LocalStorage.getItem<string>(LAST_USED_CONFIG_KEY);
      if (!configString) {
        return null;
      }
      return JSON.parse(configString) as Configuration;
    } catch (error) {
      console.error("Failed to load configuration:", error);
      return null;
    }
  }

  /**
   * Clear the saved configuration from local storage
   */
  static async clearLastUsedConfig(): Promise<void> {
    try {
      await LocalStorage.removeItem(LAST_USED_CONFIG_KEY);
    } catch (error) {
      console.error("Failed to clear configuration:", error);
      throw new Error("Failed to clear configuration");
    }
  }
}
