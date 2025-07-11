import React, { useState, useEffect } from "react";
import { Form, ActionPanel, Action, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { Configuration } from "../types";

interface Step1FormProps {
  config: Configuration;
  onSubmit: (config: Configuration) => void;
  isLoading: boolean;
  onClearSavedConfig?: () => void;
}

export function Step1Form({ config, onSubmit, isLoading, onClearSavedConfig }: Step1FormProps) {
  const [sourceFolder, setSourceFolder] = useState(config.sourceFolder);
  const [destinationFolder, setDestinationFolder] = useState(config.destinationFolder);
  const [sameAsSource, setSameAsSource] = useState(config.sameAsSource);
  const [moveFiles, setMoveFiles] = useState(config.moveFiles);

  useEffect(() => {
    if (sameAsSource && sourceFolder) {
      setDestinationFolder(sourceFolder);
    }
  }, [sameAsSource, sourceFolder]);

  const handleSubmit = (values: {
    sourceFolder: string;
    destinationFolder: string;
    moveFiles: boolean;
    sameAsSource: boolean;
  }) => {
    const finalConfig: Configuration = {
      sourceFolder: values.sourceFolder,
      destinationFolder: values.sameAsSource ? values.sourceFolder : values.destinationFolder,
      moveFiles: values.moveFiles || false,
      sameAsSource: values.sameAsSource,
    };
    onSubmit(finalConfig);
  };

  const selectSourceFolder = async () => {
    try {
      const selectedItems = await getSelectedFinderItems();
      if (selectedItems.length > 0) {
        const selectedPath = selectedItems[0].path;
        setSourceFolder(selectedPath);
        await showToast({
          style: Toast.Style.Success,
          title: "Source folder selected",
          message: selectedPath,
        });
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error selecting folder",
        message: "Please select a folder in Finder first",
      });
    }
  };

  const selectDestinationFolder = async () => {
    try {
      const selectedItems = await getSelectedFinderItems();
      if (selectedItems.length > 0) {
        const selectedPath = selectedItems[0].path;
        setDestinationFolder(selectedPath);
        await showToast({
          style: Toast.Style.Success,
          title: "Destination folder selected",
          message: selectedPath,
        });
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error selecting folder",
        message: "Please select a folder in Finder first",
      });
    }
  };

  const handleClearSavedConfig = async () => {
    if (onClearSavedConfig) {
      onClearSavedConfig();
      // Reset form to default values
      setSourceFolder("");
      setDestinationFolder("");
      setSameAsSource(true);
      setMoveFiles(false);
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
          <Action
            title="Select Source Folder"
            onAction={selectSourceFolder}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          {!sameAsSource && (
            <Action
              title="Select Destination Folder"
              onAction={selectDestinationFolder}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          )}
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

      <Form.TextField
        id="sourceFolder"
        title="Source Folder"
        placeholder="Select a folder in Finder, then click 'Select Source Folder'"
        value={sourceFolder}
        onChange={setSourceFolder}
      />

      <Form.Checkbox
        id="sameAsSource"
        title="Same as source"
        label="Use the same folder for destination"
        value={sameAsSource}
        onChange={setSameAsSource}
      />

      {!sameAsSource && (
        <Form.TextField
          id="destinationFolder"
          title="Destination Folder"
          placeholder="Select a folder in Finder, then click 'Select Destination Folder'"
          value={destinationFolder}
          onChange={setDestinationFolder}
        />
      )}

      <Form.Checkbox
        id="moveFiles"
        title="Move files"
        label="Move files instead of copying them"
        value={moveFiles}
        onChange={setMoveFiles}
      />

      <Form.Description text="To select folders: 1) Open Finder and navigate to the desired folder, 2) Select the folder, 3) Click the 'Select Source/Destination Folder' action below, 4) Click 'Extract Dates' to scan the source folder and find all distinct creation dates." />
    </Form>
  );
}
