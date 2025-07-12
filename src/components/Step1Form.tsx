import React, { useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { Configuration } from "../types";

interface Step1FormProps {
  config: Configuration;
  onSubmit: (config: Configuration) => void;
  isLoading: boolean;
  onClearSavedConfig?: () => void;
}

export function Step1Form({ config, onSubmit, isLoading, onClearSavedConfig }: Step1FormProps) {
  const [sourceFolder, setSourceFolder] = useState<string[]>(config.sourceFolder ? [config.sourceFolder] : []);
  const [destinationFolder, setDestinationFolder] = useState<string[]>(
    config.destinationFolder ? [config.destinationFolder] : [],
  );
  const [sameAsSource, setSameAsSource] = useState(config.sameAsSource);
  const [moveFiles, setMoveFiles] = useState(config.moveFiles);
  const [renameFiles, setRenameFiles] = useState(config.renameFiles ?? true);

  useEffect(() => {
    if (sameAsSource && sourceFolder.length > 0) {
      setDestinationFolder(sourceFolder);
    }
  }, [sameAsSource, sourceFolder]);

  const handleSubmit = (values: {
    sourceFolder: string[];
    destinationFolder: string[];
    moveFiles: boolean;
    sameAsSource: boolean;
    renameFiles: boolean;
  }) => {
    const finalConfig: Configuration = {
      sourceFolder: values.sourceFolder[0] || "",
      destinationFolder: values.sameAsSource ? values.sourceFolder[0] || "" : values.destinationFolder[0] || "",
      moveFiles: values.moveFiles || false,
      sameAsSource: values.sameAsSource,
      renameFiles: values.renameFiles ?? true,
    };
    onSubmit(finalConfig);
  };

  const handleClearSavedConfig = async () => {
    if (onClearSavedConfig) {
      onClearSavedConfig();
      // Reset form to default values
      setSourceFolder([]);
      setDestinationFolder([]);
      setSameAsSource(true);
      setMoveFiles(false);
      setRenameFiles(true);
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
          <Action.SubmitForm title="Extract Dates" onSubmit={handleSubmit} />
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
      <Form.Description text="Step 1: Configure source and destination folders" />

      <Form.FilePicker
        id="sourceFolder"
        title="Source Folder"
        value={sourceFolder}
        onChange={setSourceFolder}
        canChooseDirectories={true}
        canChooseFiles={false}
        allowMultipleSelection={false}
      />

      <Form.Checkbox
        id="sameAsSource"
        label="Destination is same as source"
        value={sameAsSource}
        onChange={setSameAsSource}
      />

      {!sameAsSource && (
        <Form.FilePicker
          id="destinationFolder"
          title="Destination Folder"
          value={destinationFolder}
          onChange={setDestinationFolder}
          canChooseDirectories={true}
          canChooseFiles={false}
          allowMultipleSelection={false}
        />
      )}

      <Form.Checkbox id="moveFiles" label="Move files" value={moveFiles} onChange={setMoveFiles} />

      <Form.Checkbox id="renameFiles" label="Rename files" value={renameFiles} onChange={setRenameFiles} />
    </Form>
  );
}
