import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import exifr from "exifr";
import ffprobe from "ffprobe-static";

const execFileAsync = promisify(execFile);

export interface MediaProcessorConfig {
  imageExtensions: Set<string>;
  maxProjectNameLength: number;
  dryRun: boolean;
  moveFiles: boolean;
  renameFiles: boolean;
  name?: string;
  sourceFolder?: string;
  destinationFolder?: string;
}

export class MediaProcessor {
  private config: MediaProcessorConfig;

  // File extension constants to avoid duplication
  private static readonly JPEG_EXTENSIONS = [".jpg", ".jpeg"];
  private static readonly RAW_EXTENSIONS = [".raf", ".gpr", ".raw", ".cr2", ".nef", ".arw"];
  private static readonly VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm", ".m4v"];

  constructor(config: MediaProcessorConfig) {
    this.config = config;
  }

  static getDefaultConfig(): MediaProcessorConfig {
    return {
      imageExtensions: new Set([
        ".jpg",
        ".jpeg",
        ".dng",
        ".raf",
        ".raw",
        ".cr2",
        ".nef",
        ".arw",
        ".gpr",
        ".mp4",
        ".mov",
        ".avi",
        ".mkv",
        ".wmv",
        ".flv",
        ".webm",
        ".m4v",
      ]),
      maxProjectNameLength: 50,
      dryRun: false,
      moveFiles: false,
      renameFiles: true,
    };
  }

  /**
   * Utility method to format date as YYYYMMDD string
   */
  private formatDateAsString(date: Date): string {
    return (
      date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, "0") +
      date.getDate().toString().padStart(2, "0")
    );
  }

  /**
   * Utility method to get date-only part of a Date object
   */
  private getDateOnly(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  /**
   * Utility method to check if a date is valid
   */
  private isValidDate(date: Date): boolean {
    return !isNaN(date.getTime());
  }

  /**
   * Utility method to check if file extension matches any in the given array
   */
  private hasExtension(filePath: string, extensions: string[]): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return extensions.includes(ext);
  }

  /**
   * Utility method for consistent error logging
   */
  private logError(message: string, error?: unknown): void {
    if (error) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  }

  /**
   * Utility method for consistent info logging
   */
  private logInfo(message: string): void {
    console.log(message);
  }

  /**
   * Expand tilde (~) in file paths to the user's home directory
   */
  private expandTilde(filePath: string): string {
    if (filePath.startsWith("~")) {
      return path.join(os.homedir(), filePath.slice(1));
    }
    return filePath;
  }

  /**
   * Find all media files in the source directory and its subdirectories
   */
  async findMediaFiles(sourceDir: string): Promise<Set<string>> {
    const files = new Set<string>();
    const expandedSourceDir = this.expandTilde(sourceDir);

    const scanDirectory = async (dir: string) => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (this.config.imageExtensions.has(ext)) {
              files.add(fullPath);
            }
          }
        }
      } catch (error) {
        this.logError(`Error scanning directory ${dir}:`, error);
        throw error;
      }
    };

    await scanDirectory(expandedSourceDir);
    return files;
  }

  /**
   * Extract creation date from media file using multiple methods
   */
  async getMediaDate(filePath: string): Promise<Date> {
    try {
      // 1. Try EXIF data for JPEG images
      if (this.hasExtension(filePath, MediaProcessor.JPEG_EXTENSIONS)) {
        const exifDate = await this.getExifDate(filePath);
        if (exifDate) {
          this.logInfo(`EXIF date for ${path.basename(filePath)}: ${exifDate}`);
          return exifDate;
        }
      }

      // 2. Try RAW metadata for RAW files
      if (this.hasExtension(filePath, MediaProcessor.RAW_EXTENSIONS)) {
        const rawDate = await this.getRawDate(filePath);
        if (rawDate) {
          this.logInfo(`RAW metadata date for ${path.basename(filePath)}: ${rawDate}`);
          return rawDate;
        }
      }

      // 3. Try video metadata for video files
      if (this.hasExtension(filePath, MediaProcessor.VIDEO_EXTENSIONS)) {
        const videoDate = await this.getVideoDate(filePath);
        if (videoDate) {
          this.logInfo(`Video metadata date for ${path.basename(filePath)}: ${videoDate}`);
          return videoDate;
        }
      }

      // 4. Fallback to file creation date
      const stats = await fs.promises.stat(filePath);
      const creationDate = new Date(stats.birthtime);
      this.logInfo(`Using file creation date for ${path.basename(filePath)}: ${creationDate}`);
      return creationDate;
    } catch (error) {
      this.logError(`Warning: Could not get creation date for ${filePath}:`, error);
      return new Date();
    }
  }

  /**
   * Extract date from EXIF data
   */
  private async getExifDate(filePath: string): Promise<Date | null> {
    try {
      const exif = await exifr.parse(filePath, {
        tiff: false,
        xmp: false,
        icc: false,
        ihdr: false,
        iptc: false,
        jfif: false,
        exif: true,
      });

      if (!exif) {
        this.logInfo(`No EXIF data found in ${path.basename(filePath)}`);
        return null;
      }

      // Try different EXIF date fields in order of preference
      const dateFields = [
        "DateTimeOriginal", // When the image was taken
        "DateTimeDigitized", // When the image was digitized
        "DateTime", // When the file was modified
      ];

      for (const field of dateFields) {
        const value = exif[field];
        if (value && typeof value === "string" && value.trim()) {
          try {
            // EXIF dates are typically in format: YYYY:MM:DD HH:MM:SS
            const dateStr = value.replace(/:/, " ").replace(/:/, " "); // Replace first two colons with spaces
            const parsedDate = new Date(dateStr);
            if (this.isValidDate(parsedDate)) {
              this.logInfo(`  Using ${field} date: ${parsedDate}`);
              return parsedDate;
            }
          } catch {
            this.logInfo(`  Error parsing ${field} date`);
            continue;
          }
        }
      }

      return null;
    } catch (error) {
      this.logError(`Error reading EXIF from ${path.basename(filePath)}:`, error);
      return null;
    }
  }

  /**
   * Extract date from RAW file metadata using exiftool
   */
  private async getRawDate(filePath: string): Promise<Date | null> {
    try {
      // Use exiftool if available, otherwise fall back to file creation date
      const { stdout } = await execFileAsync("exiftool", [
        "-DateTimeOriginal",
        "-d",
        "%Y:%m:%d %H:%M:%S",
        "-j",
        filePath,
      ]);

      const result = JSON.parse(stdout);
      if (result && result[0] && result[0].DateTimeOriginal) {
        const date = new Date(result[0].DateTimeOriginal);
        if (this.isValidDate(date)) {
          return date;
        }
      }

      return null;
    } catch {
      // exiftool not available or failed, fall back to file creation date
      this.logInfo(
        `Note: exiftool not available for RAW metadata extraction. Using file creation date for ${path.basename(filePath)}.`,
      );
      return null;
    }
  }

  /**
   * Extract date from video metadata using ffprobe
   */
  private async getVideoDate(filePath: string): Promise<Date | null> {
    try {
      const { stdout } = await execFileAsync(ffprobe.path, [
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        filePath,
      ]);

      const result = JSON.parse(stdout);
      if (result && result.format) {
        const format = result.format;

        // Try various date fields
        const dateFields = ["creation_time", "date", "date_created", "date_modified"];

        for (const field of dateFields) {
          const value = format[field];
          if (value && typeof value === "string") {
            try {
              const date = new Date(value);
              if (this.isValidDate(date)) {
                return date;
              }
            } catch {
              continue;
            }
          }
        }
      }

      return null;
    } catch {
      this.logError(`Warning: Could not extract video metadata from ${filePath}`);
      return null;
    }
  }

  /**
   * Check if there's enough disk space to copy the file
   */
  private async hasEnoughDiskSpace(src: string, dst: string): Promise<boolean> {
    try {
      const srcStats = await fs.promises.stat(src);
      const dstDir = path.dirname(dst);
      const dstStats = await fs.promises.statfs(dstDir);
      return dstStats.bavail * dstStats.bsize > srcStats.size;
    } catch (error) {
      this.logError("Error checking disk space:", error);
      return false;
    }
  }

  /**
   * Check if we have write permissions for the directory
   */
  private async canWriteToDirectory(directory: string): Promise<boolean> {
    try {
      const testFile = path.join(directory, ".write_test");
      await fs.promises.writeFile(testFile, "");
      await fs.promises.unlink(testFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Safely copy or move a file with proper error handling
   */
  async safeCopyFile(src: string, dst: string): Promise<void> {
    if (this.config.dryRun) {
      this.logInfo(`Would ${this.config.moveFiles ? "move" : "copy"} ${src} to ${dst}`);
      return;
    }

    try {
      // Check available disk space
      if (!(await this.hasEnoughDiskSpace(src, dst))) {
        throw new Error(`Not enough disk space to copy ${src}`);
      }

      // Check permissions
      if (!(await this.canWriteToDirectory(path.dirname(dst)))) {
        throw new Error(`Cannot write to ${path.dirname(dst)}`);
      }

      // Create parent directory if it doesn't exist
      await fs.promises.mkdir(path.dirname(dst), { recursive: true });

      // Copy or move the file
      if (this.config.moveFiles) {
        await fs.promises.rename(src, dst);
        this.logInfo(`Moved ${src} to ${dst}`);
      } else {
        await fs.promises.copyFile(src, dst);
        this.logInfo(`Copied ${src} to ${dst}`);
      }
    } catch (error) {
      this.logError(`Error processing ${src}:`, error);
      throw error;
    }
  }

  /**
   * Create a folder named YYYYMMDD_PROJECT_NAME in the base directory
   */
  async createDateFolder(baseDir: string, date: Date, projectName: string): Promise<string> {
    const dateStr = this.formatDateAsString(date);
    const folderName = `${dateStr}_${projectName}`;
    const folderPath = path.join(baseDir, folderName);

    try {
      if (!this.config.dryRun) {
        await fs.promises.mkdir(folderPath, { recursive: true });
      }
      this.logInfo(`Created/accessed folder: ${folderPath}`);
      return folderPath;
    } catch (error) {
      this.logError(`Error creating folder ${folderPath}:`, error);
      throw error;
    }
  }

  /**
   * Generate unique filename to avoid conflicts
   */
  private async generateUniqueFilename(folderPath: string, originalName: string, prefix: string): Promise<string> {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);

    if (!this.config.renameFiles) {
      // Use original name with conflict resolution
      let filename = originalName;
      let fullPath = path.join(folderPath, filename);
      let counter = 1;

      while (await this.fileExists(fullPath)) {
        filename = `${baseName}_${counter}${ext}`;
        fullPath = path.join(folderPath, filename);
        counter++;
      }

      return filename;
    }

    // Original rename logic with prefix
    let counter = 1;
    let filename = `${prefix}_${originalName}`;
    let fullPath = path.join(folderPath, filename);

    while (await this.fileExists(fullPath)) {
      filename = `${prefix}_${baseName}_${counter}${ext}`;
      fullPath = path.join(folderPath, filename);
      counter++;
    }

    return filename;
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract unique creation dates from files
   */
  async extractDates(sourceFolder: string): Promise<string[]> {
    const files = await this.findMediaFiles(sourceFolder);
    const uniqueDates = new Set<string>();

    for (const file of files) {
      try {
        const mediaDate = await this.getMediaDate(file);
        const dateOnly = this.getDateOnly(mediaDate);
        const dateStr = this.formatDateAsString(dateOnly);
        uniqueDates.add(dateStr);
      } catch (error) {
        this.logError(`Error processing file ${file}:`, error);
        continue;
      }
    }

    return Array.from(uniqueDates).sort();
  }

  /**
   * Group files based on date→project mapping
   */
  async groupFiles(
    sourceFolder: string,
    destinationFolder: string,
    projectNames: Record<string, string>,
  ): Promise<void> {
    const files = await this.findMediaFiles(sourceFolder);
    const fileDateMapping = new Map<string, Date>();
    const expandedDestinationFolder = this.expandTilde(destinationFolder);

    // Get dates for all files
    for (const file of files) {
      try {
        const mediaDate = await this.getMediaDate(file);
        fileDateMapping.set(file, mediaDate);
      } catch (error) {
        this.logError(`Error getting date for ${file}:`, error);
        continue;
      }
    }

    // Process each file
    for (const [file, mediaDate] of fileDateMapping) {
      const dateOnly = this.getDateOnly(mediaDate);
      const dateStr = this.formatDateAsString(dateOnly);

      const projectName = projectNames[dateStr];
      if (!projectName) {
        continue; // skip files with no mapping
      }

      const dateFolder = await this.createDateFolder(expandedDestinationFolder, mediaDate, projectName);
      const originalName = path.basename(file);
      const uniqueFilename = await this.generateUniqueFilename(dateFolder, originalName, path.basename(dateFolder));
      const destFile = path.join(dateFolder, uniqueFilename);

      await this.safeCopyFile(file, destFile);
    }

    this.logInfo("Processing completed");
  }
}
