import React, { useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { Configuration, ProjectAssignment, DateExtractionResult } from "./types";
import { MediaService } from "./services/mediaService";
import { Step1Form } from "./components/Step1Form";
import { Step2Form } from "./components/Step2Form";

export default function OrganiseMedia() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [config, setConfig] = useState<Configuration>({
    sourceFolder: "",
    destinationFolder: "",
    moveFiles: false,
    sameAsSource: true,
  });
  const [dateExtractionResult, setDateExtractionResult] = useState<DateExtractionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStep1Submit = async (configuration: Configuration) => {
    setIsLoading(true);
    try {
      const result = await MediaService.extractCreationDates(configuration.sourceFolder);
      setDateExtractionResult(result);
      setConfig(configuration);
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

  if (currentStep === 1) {
    return <Step1Form config={config} onSubmit={handleStep1Submit} isLoading={isLoading} />;
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
