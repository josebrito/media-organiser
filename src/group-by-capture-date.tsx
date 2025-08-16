import React, { useState, useEffect } from "react";
import { showToast, Toast, popToRoot, open } from "@raycast/api";
import { Configuration, ProjectAssignment, DateExtractionResult } from "./common/types";
import { MediaService } from "./services/mediaService";
import { ConfigStorage } from "./common/ConfigStorage";
import { Step1Form } from "./components/Step1Form";
import { Step2Form } from "./components/Step2Form";

export default function GroupByCaptureDate() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [config, setConfig] = useState<Configuration>({
    sourceFolder: "",
    destinationFolder: "",
    moveFiles: false,
    sameAsSource: true,
    renameFiles: true,
  });
  const [dateExtractionResult, setDateExtractionResult] = useState<DateExtractionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load last used configuration on component mount
  useEffect(() => {
    const loadLastConfig = async () => {
      try {
        const lastConfig = await ConfigStorage.loadLastUsedConfig();
        if (lastConfig) {
          setConfig(lastConfig);
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
      const result = await MediaService.extractCreationDates(configuration.sourceFolder);
      setDateExtractionResult(result);
      setConfig(configuration);

      // Save the configuration for next use
      await ConfigStorage.saveLastUsedConfig(configuration);

      setCurrentStep(2);
      await showToast({
        style: Toast.Style.Success,
        title: "Dates extracted successfully",
        message: `Found ${result.dates.length} distinct dates`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error extracting dates",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2Submit = async (projectAssignments: ProjectAssignment[]) => {
    setIsLoading(true);
    try {
      const result = await MediaService.organizeFiles(config, projectAssignments);
      await showToast({
        style: Toast.Style.Success,
        title: "Files organized successfully",
        message: result.message,
      });

      // Open the destination folder and close Raycast
      const destinationPath = config.sameAsSource ? config.sourceFolder : config.destinationFolder;
      await open(destinationPath);
      popToRoot();

      // Reset to step 1 for next use
      setCurrentStep(1);
      setDateExtractionResult(null);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error organizing files",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToStep1 = () => {
    setCurrentStep(1);
    setDateExtractionResult(null);
  };

  const handleClearSavedConfig = async () => {
    try {
      await ConfigStorage.clearLastUsedConfig();
    } catch (error) {
      console.error("Failed to clear saved configuration:", error);
    }
  };

  if (currentStep === 1) {
    return (
      <Step1Form
        config={config}
        onSubmit={handleStep1Submit}
        isLoading={isLoading}
        onClearSavedConfig={handleClearSavedConfig}
        submitTitle="Extract Dates"
        description="Step 1: Configure source and destination folders"
        showRenameOption={true}
      />
    );
  }

  if (currentStep === 2 && dateExtractionResult) {
    return (
      <Step2Form
        dates={dateExtractionResult.dates}
        onSubmit={handleStep2Submit}
        onBack={handleBackToStep1}
        isLoading={isLoading}
      />
    );
  }

  return null;
}
