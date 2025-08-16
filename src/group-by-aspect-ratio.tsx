import React, { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { Configuration } from "./common/types";
import { AspectRatioService } from "./services/aspectRatioService";
import { ConfigStorage } from "./common/ConfigStorage";
import { Step1Form } from "./components/Step1Form";

export default function GroupByAspectRatio() {
  const [config, setConfig] = useState<Configuration>({
    sourceFolder: "",
    destinationFolder: "",
    moveFiles: false,
    sameAsSource: true,
    renameFiles: false, // Always false for aspect ratio grouping
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load last used configuration on component mount
  useEffect(() => {
    const loadLastConfig = async () => {
      try {
        const lastConfig = await ConfigStorage.loadLastUsedConfig();
        if (lastConfig) {
          // Ensure renameFiles is false for aspect ratio grouping
          setConfig({ ...lastConfig, renameFiles: false });
        }
      } catch (error) {
        console.error("Failed to load last used configuration:", error);
      }
    };

    loadLastConfig();
  }, []);

  const handleStep1Submit = async (configuration: Configuration) => {
    setIsLoading(true);
    try {
      // Ensure renameFiles is false for aspect ratio grouping
      const finalConfig = { ...configuration, renameFiles: false };

      // First analyze the images
      const result = await AspectRatioService.analyzeAspectRatios(finalConfig.sourceFolder);

      // Then immediately organize them
      const organizationResult = await AspectRatioService.organizeByAspectRatio(finalConfig, result);

      setConfig(finalConfig);

      // Save the configuration for next use
      await ConfigStorage.saveLastUsedConfig(finalConfig);

      // Show success message with results
      await showToast({
        style: Toast.Style.Success,
        title: "Images organized successfully",
        message: `Processed ${result.images.length} images: ${result.categories.Landscape} Landscape, ${result.categories.Portrait} Portrait, ${result.categories.Square} Square. ${organizationResult.message}`,
      });

      // Reset form for next use
      setConfig({
        sourceFolder: "",
        destinationFolder: "",
        moveFiles: false,
        sameAsSource: true,
        renameFiles: false,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error processing images",
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
        destinationFolder: "",
        moveFiles: false,
        sameAsSource: true,
        renameFiles: false,
      });
    } catch (error) {
      console.error("Failed to clear saved configuration:", error);
    }
  };

  return (
    <Step1Form
      config={config}
      onSubmit={handleStep1Submit}
      isLoading={isLoading}
      onClearSavedConfig={handleClearSavedConfig}
      submitTitle="Analyze and Organize Images"
      description="Configure source and destination folders to organize images by aspect ratio (Landscape, Portrait, Square)"
      showRenameOption={false}
    />
  );
}
