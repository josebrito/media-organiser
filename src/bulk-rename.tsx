import React, { useState, useEffect } from "react";
import { showToast, Toast, popToRoot, open } from "@raycast/api";
import { BulkRenameConfig } from "./common/types";
import { BulkRenameService } from "./services/bulkRenameService";
import { ConfigStorage } from "./common/ConfigStorage";
import { BulkRenameForm } from "./components/BulkRenameForm";

export default function BulkRename() {
  const [, setConfig] = useState<BulkRenameConfig>({
    sourceFolder: "",
    prefix: "",
    suffix: "",
    includeOriginalName: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load last used configuration on component mount
  useEffect(() => {
    const loadLastConfig = async () => {
      try {
        const lastConfig = await ConfigStorage.loadLastUsedConfig();
        if (lastConfig) {
          setConfig({
            sourceFolder: lastConfig.sourceFolder,
            prefix: "",
            suffix: "",
            includeOriginalName: true,
          });
        }
      } catch (error) {
        console.error("Failed to load last used configuration:", error);
      }
    };

    loadLastConfig();
  }, []);

  const handleSubmit = async (configuration: BulkRenameConfig) => {
    setIsLoading(true);
    try {
      const result = await BulkRenameService.bulkRenameFiles(configuration);

      if (result.success) {
        setConfig(configuration);

        // Save the configuration for next use (convert to Configuration format)
        await ConfigStorage.saveLastUsedConfig({
          sourceFolder: configuration.sourceFolder,
          destinationFolder: configuration.sourceFolder,
          moveFiles: false,
          sameAsSource: true,
          renameFiles: true,
        });

        await showToast({
          style: Toast.Style.Success,
          title: "Files renamed successfully",
          message: result.message,
        });

        // Open the source folder and close Raycast
        await open(configuration.sourceFolder);
        popToRoot();

        // Reset form for next use
        setConfig({
          sourceFolder: "",
          prefix: "",
          suffix: "",
          includeOriginalName: true,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error renaming files",
          message: result.message,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error renaming files",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSavedConfig = async () => {
    try {
      await ConfigStorage.clearLastUsedConfig();
      setConfig({
        sourceFolder: "",
        prefix: "",
        suffix: "",
        includeOriginalName: true,
      });
    } catch (error) {
      console.error("Failed to clear saved configuration:", error);
    }
  };

  return <BulkRenameForm onSubmit={handleSubmit} isLoading={isLoading} onClearSavedConfig={handleClearSavedConfig} />;
}
