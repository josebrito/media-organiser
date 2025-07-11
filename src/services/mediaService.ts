import { DateExtractionResult, Configuration, ProjectAssignment, OrganizationResult } from "../types";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";
const execFileAsync = promisify(execFile);

export class MediaService {
  /**
   * Dummy service to extract creation dates from media files
   * This will be replaced with the actual implementation later
   */
  static async extractCreationDates(sourceFolder: string): Promise<DateExtractionResult> {
    // Call the Python script (no --json-details)
    const pythonPath = "python3";
    const scriptPath = path.resolve(__dirname, "../python/main.py");
    try {
      const { stdout } = await execFileAsync(pythonPath, [scriptPath, "extract-dates", sourceFolder], {
        maxBuffer: 10 * 1024 * 1024,
      });
      const result: unknown = JSON.parse(stdout);
      if (Array.isArray(result)) {
        const dates = result.map((d) => {
          const year = parseInt(d.slice(0, 4));
          const month = parseInt(d.slice(4, 6)) - 1;
          const day = parseInt(d.slice(6, 8));
          return new Date(year, month, day);
        });
        return { dates, files: [] };
      }
      throw new Error("Unexpected output from Python script");
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "stderr" in error) {
        throw new Error((error as { stderr: string }).stderr || "Failed to extract creation dates with Python script.");
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to extract creation dates with Python script.");
    }
  }

  /**
   * Organize files based on project assignments
   * This will be replaced with actual file system operations
   */
  static async organizeFiles(
    config: Configuration,
    projectAssignments: ProjectAssignment[],
  ): Promise<OrganizationResult> {
    const pythonPath = "python3";
    const scriptPath = path.resolve(__dirname, "../python/main.py");
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
    // Write mapping to temp file
    const tmpFile = fs.mkdtempSync(path.join(os.tmpdir(), "media-mapping-")) + ".json";
    fs.writeFileSync(tmpFile, JSON.stringify(mapping), "utf8");
    try {
      const args = [
        scriptPath,
        "group",
        config.sourceFolder,
        config.destinationFolder,
        ...(config.moveFiles ? ["--move"] : []),
        "--mapping",
        tmpFile,
      ];
      const { stdout } = await execFileAsync(pythonPath, args, { maxBuffer: 10 * 1024 * 1024 });
      // The script prints "Processing completed" on success
      return {
        success: true,
        message: stdout.trim() || "Processing completed",
        processedFiles: projectAssignments.length, // Approximate, as actual count is not returned
      };
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "stderr" in error) {
        throw new Error((error as { stderr: string }).stderr || "Failed to organize files with Python script.");
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to organize files with Python script.");
    } finally {
      try {
        fs.unlinkSync(tmpFile);
      } catch {
        /* ignore error */
      }
    }
  }
}
