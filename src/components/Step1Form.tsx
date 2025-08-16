import React, { useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { Configuration } from "../common/types";

interface Step1FormProps {
  config: Configuration;
  onSubmit: (config: Configuration) => void;
  isLoading: boolean;
  onClearSavedConfig?: () => void;
  submitTitle?: string;
  description?: string;
  showRenameOption?: boolean;
}

// Extract default values to avoid duplication
const DEFAULT_CONFIG = {
  sourceFolder: "",
  destinationFolder: "",
  sameAsSource: true,
  moveFiles: false,
  renameFiles: true,
} as const;

// Helper function to convert string to array for Form.FilePicker
const stringToArray = (value: string | undefined): string[] => (value ? [value] : []);

// Helper function to convert array to string for Configuration
const arrayToString = (value: string[]): string => value[0] || "";

export function Step1Form({
  config,
  onSubmit,
  isLoading,
  onClearSavedConfig,
  submitTitle = "Continue",
  description = "Step 1: Configure source and destination folders",
  showRenameOption = true,
}: Step1FormProps) {
  // Consolidate form state into a single object
  const [formState, setFormState] = useState({
    sourceFolder: stringToArray(config.sourceFolder),
    destinationFolder: stringToArray(config.destinationFolder),
    sameAsSource: config.sameAsSource ?? DEFAULT_CONFIG.sameAsSource,
    moveFiles: config.moveFiles ?? DEFAULT_CONFIG.moveFiles,
    renameFiles: config.renameFiles ?? DEFAULT_CONFIG.renameFiles,
  });

  // Update destination folder when sameAsSource changes
  useEffect(() => {
    if (formState.sameAsSource && formState.sourceFolder.length > 0) {
      setFormState((prev) => ({
        ...prev,
        destinationFolder: formState.sourceFolder,
      }));
    }
  }, [formState.sameAsSource, formState.sourceFolder]);

  // Helper function to update form state
  const updateFormState = (updates: Partial<typeof formState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = (values: {
    sourceFolder: string[];
    destinationFolder: string[];
    moveFiles: boolean;
    sameAsSource: boolean;
    renameFiles: boolean;
  }) => {
    const finalConfig: Configuration = {
      sourceFolder: arrayToString(values.sourceFolder),
      destinationFolder: values.sameAsSource
        ? arrayToString(values.sourceFolder)
        : arrayToString(values.destinationFolder),
      moveFiles: values.moveFiles,
      sameAsSource: values.sameAsSource,
      renameFiles: values.renameFiles,
    };
    onSubmit(finalConfig);
  };

  const handleClearSavedConfig = async () => {
    if (onClearSavedConfig) {
      onClearSavedConfig();
      // Reset form to default values using the helper function
      setFormState({
        sourceFolder: [],
        destinationFolder: [],
        sameAsSource: DEFAULT_CONFIG.sameAsSource,
        moveFiles: DEFAULT_CONFIG.moveFiles,
        renameFiles: DEFAULT_CONFIG.renameFiles,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Saved configuration cleared",
        message: "Form reset to default values",
      });
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={handleSubmit} />
          {onClearSavedConfig && (
            <Action
              title="Clear Saved Configuration"
              onAction={handleClearSavedConfig}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description text={description} />

      <Form.FilePicker
        id="sourceFolder"
        title="Source Folder"
        value={formState.sourceFolder}
        onChange={(value) => updateFormState({ sourceFolder: value })}
        canChooseDirectories={true}
        canChooseFiles={false}
        allowMultipleSelection={false}
      />

      <Form.Checkbox
        id="sameAsSource"
        label="Destination is same as source"
        value={formState.sameAsSource}
        onChange={(value) => updateFormState({ sameAsSource: value })}
      />

      {!formState.sameAsSource && (
        <Form.FilePicker
          id="destinationFolder"
          title="Destination Folder"
          value={formState.destinationFolder}
          onChange={(value) => updateFormState({ destinationFolder: value })}
          canChooseDirectories={true}
          canChooseFiles={false}
          allowMultipleSelection={false}
        />
      )}

      <Form.Checkbox
        id="moveFiles"
        label="Move files"
        value={formState.moveFiles}
        onChange={(value) => updateFormState({ moveFiles: value })}
      />

      {showRenameOption && (
        <Form.Checkbox
          id="renameFiles"
          label="Rename files"
          value={formState.renameFiles}
          onChange={(value) => updateFormState({ renameFiles: value })}
        />
      )}
    </Form>
  );
}
