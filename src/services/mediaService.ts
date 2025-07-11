import { DateExtractionResult, Configuration, ProjectAssignment, OrganizationResult } from "../types";
import { MediaProcessor } from "./mediaProcessor";

export class MediaService {
  /**
   * Extract creation dates from media files using the TypeScript implementation
   */
  static async extractCreationDates(sourceFolder: string): Promise<DateExtractionResult> {
    try {
      const processor = new MediaProcessor(MediaProcessor.getDefaultConfig());
      const dateStrings = await processor.extractDates(sourceFolder);

      // Convert date strings to Date objects
      const dates = dateStrings.map((dateStr) => {
        const year = parseInt(dateStr.slice(0, 4));
        const month = parseInt(dateStr.slice(4, 6)) - 1;
        const day = parseInt(dateStr.slice(6, 8));
        return new Date(year, month, day);
      });

      // For now, return empty files array since we're not tracking individual files
      // This could be enhanced to return actual file information if needed
      return { dates, files: [] };
    } catch (error) {
      console.error("[DEBUG] Error:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to extract creation dates.");
    }
  }

  /**
   * Organize files based on project assignments using the TypeScript implementation
   */
  static async organizeFiles(
    config: Configuration,
    projectAssignments: ProjectAssignment[],
  ): Promise<OrganizationResult> {
    try {
      // Prepare mapping: { YYYYMMDD: projectName }
      const mapping: Record<string, string> = {};
      for (const assignment of projectAssignments) {
        const date = assignment.date;
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, "0");
        const d = date.getDate().toString().padStart(2, "0");
        const key = `${y}${m}${d}`;
        mapping[key] = assignment.projectName;
      }

      const processorConfig = MediaProcessor.getDefaultConfig();
      processorConfig.moveFiles = config.moveFiles;

      const processor = new MediaProcessor(processorConfig);
      await processor.groupFiles(config.sourceFolder, config.destinationFolder, mapping);

      return {
        success: true,
        message: "Processing completed",
        processedFiles: projectAssignments.length, // Approximate, as actual count is not returned
      };
    } catch (error) {
      console.error("[DEBUG] Error:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to organize files.");
    }
  }
}
