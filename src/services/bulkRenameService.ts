import fs from "fs";
import path from "path";
import { BulkRenameConfig, BulkRenameResult } from "../common/types";

export class BulkRenameService {
  /**
   * Rename all files in a folder according to the specified configuration
   */
  static async bulkRenameFiles(config: BulkRenameConfig): Promise<BulkRenameResult> {
    try {
      // Validate source folder exists
      if (!fs.existsSync(config.sourceFolder)) {
        throw new Error(`Source folder does not exist: ${config.sourceFolder}`);
      }

      // Validate that at least one naming component is specified
      if (!config.prefix && !config.suffix && !config.includeOriginalName) {
        throw new Error("At least one naming component must be specified: prefix, suffix, or include original name");
      }

      // Get all files in the source folder
      const files = fs
        .readdirSync(config.sourceFolder)
        .filter((item) => {
          const itemPath = path.join(config.sourceFolder, item);
          return fs.statSync(itemPath).isFile();
        })
        .sort(); // Sort files for consistent ordering

      if (files.length === 0) {
        return {
          success: true,
          message: "No files found in the source folder",
          processedFiles: 0,
          renamedFiles: [],
        };
      }

      const renamedFiles: string[] = [];
      let processedCount = 0;

      for (let i = 0; i < files.length; i++) {
        const originalName = files[i];
        const originalPath = path.join(config.sourceFolder, originalName);

        // Get file extension
        const extension = path.extname(originalName);
        const nameWithoutExtension = path.basename(originalName, extension);

        // Build new name with proper underscore separators
        let newName = "";

        if (config.includeOriginalName) {
          // Include original name: PREFIX_ORIGINALNAME_SUFFIX or ORIGINALNAME_SUFFIX or PREFIX_ORIGINALNAME
          const parts = [];
          if (config.prefix) parts.push(config.prefix);
          parts.push(nameWithoutExtension);
          if (config.suffix) parts.push(config.suffix);
          newName = parts.join("_") + extension;
        } else {
          // Use sequential numbers: PREFIX_001_SUFFIX or 001_SUFFIX or PREFIX_001
          const sequentialNumber = (i + 1).toString().padStart(3, "0");
          const parts = [];
          if (config.prefix) parts.push(config.prefix);
          parts.push(sequentialNumber);
          if (config.suffix) parts.push(config.suffix);
          newName = parts.join("_") + extension;
        }

        const newPath = path.join(config.sourceFolder, newName);

        // Check if new name already exists
        if (fs.existsSync(newPath) && originalPath !== newPath) {
          // Add a unique identifier to avoid conflicts
          const timestamp = Date.now();
          const uniqueSuffix = `_${timestamp}`;
          if (config.includeOriginalName) {
            // Include original name with unique suffix: PREFIX_ORIGINALNAME_TIMESTAMP_SUFFIX
            const parts = [];
            if (config.prefix) parts.push(config.prefix);
            parts.push(nameWithoutExtension);
            parts.push(uniqueSuffix);
            if (config.suffix) parts.push(config.suffix);
            newName = parts.join("_") + extension;
          } else {
            // Use sequential numbers with unique suffix: PREFIX_001_TIMESTAMP_SUFFIX
            const uniqueSequentialNumber = (i + 1).toString().padStart(3, "0");
            const parts = [];
            if (config.prefix) parts.push(config.prefix);
            parts.push(uniqueSequentialNumber);
            parts.push(uniqueSuffix);
            if (config.suffix) parts.push(config.suffix);
            newName = parts.join("_") + extension;
          }
          const uniquePath = path.join(config.sourceFolder, newName);

          fs.renameSync(originalPath, uniquePath);
          renamedFiles.push(`${originalName} → ${newName}`);
        } else {
          fs.renameSync(originalPath, newPath);
          renamedFiles.push(`${originalName} → ${newName}`);
        }

        processedCount++;
      }

      return {
        success: true,
        message: `Successfully renamed ${processedCount} files`,
        processedFiles: processedCount,
        renamedFiles,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
        processedFiles: 0,
        renamedFiles: [],
      };
    }
  }
}
