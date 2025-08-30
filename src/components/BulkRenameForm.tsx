import React, { useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { BulkRenameConfig } from "../common/types";
import { ConfigStorage } from "../common/ConfigStorage";

interface BulkRenameFormProps {
  onSubmit: (config: BulkRenameConfig) => void;
  isLoading: boolean;
  onClearSavedConfig?: () => void;
}

// Extract default values to avoid duplication
const DEFAULT_CONFIG = {
  sourceFolder: "",
  prefix: "",
  suffix: "",
  includeOriginalName: true,
} as const;

// Helper function to convert string to array for Form.FilePicker
const stringToArray = (value: string | undefined): string[] => (value ? [value] : []);

// Helper function to convert array to string for BulkRenameConfig
const arrayToString = (value: string[]): string => value[0] || "";

export function BulkRenameForm({ onSubmit, isLoading, onClearSavedConfig }: BulkRenameFormProps) {
  // Consolidate form state into a single object
  const [formState, setFormState] = useState<{
    sourceFolder: string[];
    prefix: string;
    suffix: string;
    includeOriginalName: boolean;
  }>({
    sourceFolder: stringToArray(DEFAULT_CONFIG.sourceFolder),
    prefix: DEFAULT_CONFIG.prefix,
    suffix: DEFAULT_CONFIG.suffix,
    includeOriginalName: DEFAULT_CONFIG.includeOriginalName,
  });

  // Load last used configuration on component mount
  useEffect(() => {
    const loadLastConfig = async () => {
      try {
        const lastConfig = await ConfigStorage.loadLastUsedConfig();
        if (lastConfig) {
          setFormState((prev) => ({
            ...prev,
            sourceFolder: stringToArray(lastConfig.sourceFolder),
          }));
        }
      } catch (error) {
        console.error("Failed to load last used configuration:", error);
      }
    };

    loadLastConfig();
  }, []);

  const handleSubmit = (values: {
    sourceFolder: string[];
    prefix: string;
    suffix: string;
    includeOriginalName: boolean;
  }) => {
    const finalConfig: BulkRenameConfig = {
      sourceFolder: arrayToString(values.sourceFolder),
      prefix: values.prefix,
      suffix: values.suffix,
      includeOriginalName: values.includeOriginalName,
    };
    onSubmit(finalConfig);
  };

  const handleClearSavedConfig = async () => {
    if (onClearSavedConfig) {
      onClearSavedConfig();
      // Reset form to default values
      setFormState({
        sourceFolder: [],
        prefix: DEFAULT_CONFIG.prefix,
        suffix: DEFAULT_CONFIG.suffix,
        includeOriginalName: DEFAULT_CONFIG.includeOriginalName,
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
          <Action.SubmitForm title="Rename Files" onSubmit={handleSubmit} />
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
      <Form.Description text="Configure source folder and naming options to bulk rename files" />

      <Form.FilePicker
        id="sourceFolder"
        title="Source Folder"
        value={formState.sourceFolder}
        onChange={(value) => setFormState((prev) => ({ ...prev, sourceFolder: value }))}
        canChooseDirectories={true}
        canChooseFiles={false}
        allowMultipleSelection={false}
      />

      <Form.TextField
        id="prefix"
        title="Prefix"
        placeholder="Text to add before the filename (optional)"
        value={formState.prefix}
        onChange={(value) => setFormState((prev) => ({ ...prev, prefix: value }))}
      />

      <Form.TextField
        id="suffix"
        title="Suffix"
        placeholder="Text to add after the filename (optional)"
        value={formState.suffix}
        onChange={(value) => setFormState((prev) => ({ ...prev, suffix: value }))}
      />

      <Form.Checkbox
        id="includeOriginalName"
        title="Include Original Name"
        label="When checked, original filename is preserved between prefix and suffix. When unchecked, sequential numbers are used instead."
        value={formState.includeOriginalName}
        onChange={(value) => setFormState((prev) => ({ ...prev, includeOriginalName: value }))}
      />

      <Form.Description
        text={(() => {
          const parts = [];
          if (formState.prefix) parts.push(formState.prefix);
          if (formState.includeOriginalName) {
            parts.push(formState.sourceFolder.length > 0 ? "filename" : "original");
          } else {
            parts.push("001");
          }
          if (formState.suffix) parts.push(formState.suffix);

          if (parts.length === 0) {
            return "Error: At least one naming component must be specified (prefix, suffix, or include original name)";
          }

          return `Example: ${parts.join("_")}.jpg`;
        })()}
      />
    </Form>
  );
}
