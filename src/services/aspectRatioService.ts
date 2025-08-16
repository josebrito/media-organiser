import { readdir, stat, copyFile, unlink, mkdir } from "fs/promises";
import { join, extname, basename } from "path";
import { AspectRatioResult, ImageFile, Configuration, OrganizationResult } from "../common/types";

export class AspectRatioService {
  private static readonly IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"];
  private static readonly ASPECT_RATIO_THRESHOLD = 0.1; // Threshold for determining square vs landscape/portrait

  /**
   * Analyze images in a folder and categorize them by aspect ratio
   */
  static async analyzeAspectRatios(sourceFolder: string): Promise<AspectRatioResult> {
    try {
      const imageFiles = await this.scanForImages(sourceFolder);
      const analyzedImages = await this.analyzeImages(imageFiles);

      const categories = {
        Landscape: analyzedImages.filter((img) => img.category === "Landscape").length,
        Portrait: analyzedImages.filter((img) => img.category === "Portrait").length,
        Square: analyzedImages.filter((img) => img.category === "Square").length,
      };

      return {
        images: analyzedImages,
        categories,
      };
    } catch (error) {
      console.error("Error analyzing aspect ratios:", error);
      throw new Error("Failed to analyze aspect ratios");
    }
  }

  /**
   * Organize files based on aspect ratio categories
   */
  static async organizeByAspectRatio(
    config: Configuration,
    aspectRatioResult: AspectRatioResult,
  ): Promise<OrganizationResult> {
    try {
      const { images } = aspectRatioResult;
      let processedFiles = 0;

      for (const image of images) {
        const categoryFolder = join(config.destinationFolder, image.category);

        // Create category folder if it doesn't exist
        try {
          await mkdir(categoryFolder, { recursive: true });
        } catch {
          // Folder might already exist, continue
        }

        const destinationPath = join(categoryFolder, basename(image.path));

        if (config.moveFiles) {
          // Move file
          await copyFile(image.path, destinationPath);
          await unlink(image.path);
        } else {
          // Copy file
          await copyFile(image.path, destinationPath);
        }

        processedFiles++;
      }

      return {
        success: true,
        message: `Successfully processed ${processedFiles} images`,
        processedFiles,
      };
    } catch (error) {
      console.error("Error organizing files by aspect ratio:", error);
      throw new Error("Failed to organize files by aspect ratio");
    }
  }

  /**
   * Scan folder for image files recursively
   */
  private static async scanForImages(folderPath: string): Promise<string[]> {
    const imageFiles: string[] = [];

    try {
      const items = await readdir(folderPath);

      for (const item of items) {
        const fullPath = join(folderPath, item);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          // Recursively scan subdirectories
          const subImages = await this.scanForImages(fullPath);
          imageFiles.push(...subImages);
        } else if (stats.isFile()) {
          const extension = extname(item).toLowerCase();
          if (this.IMAGE_EXTENSIONS.includes(extension)) {
            imageFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning folder ${folderPath}:`, error);
    }

    return imageFiles;
  }

  /**
   * Analyze individual image files to determine dimensions and aspect ratio
   */
  private static async analyzeImages(imagePaths: string[]): Promise<ImageFile[]> {
    const analyzedImages: ImageFile[] = [];

    for (const imagePath of imagePaths) {
      try {
        const dimensions = await this.getImageDimensions(imagePath);

        const aspectRatio = dimensions.width / dimensions.height;
        const category = this.categorizeAspectRatio(aspectRatio);

        analyzedImages.push({
          path: imagePath,
          name: basename(imagePath),
          extension: extname(imagePath),
          width: dimensions.width,
          height: dimensions.height,
          aspectRatio,
          category,
        });
      } catch (error) {
        console.error(`Error analyzing image ${imagePath}:`, error);
        // Skip this image and continue with others
      }
    }

    return analyzedImages;
  }

  /**
   * Get image dimensions using multiple fallback methods
   */
  private static async getImageDimensions(imagePath: string): Promise<{ width: number; height: number }> {
    try {
      // Method 1: Try using exifr for EXIF data
      const dimensions = await this.getDimensionsFromExif(imagePath);
      if (dimensions) {
        return dimensions;
      }

      // Method 2: Try using a simple file header analysis for common formats
      const headerDimensions = await this.getDimensionsFromHeader(imagePath);
      if (headerDimensions) {
        return headerDimensions;
      }

      // Method 3: Fallback to estimated dimensions based on file size
      return await this.estimateDimensionsFromFileSize(imagePath);
    } catch (error) {
      console.error(`Error getting dimensions for ${imagePath}:`, error);
      // Final fallback: return standard dimensions
      return { width: 1920, height: 1080 };
    }
  }

  /**
   * Try to extract dimensions from EXIF data using exifr
   */
  private static async getDimensionsFromExif(imagePath: string): Promise<{ width: number; height: number } | null> {
    try {
      // Dynamic import to avoid issues if exifr is not available
      const exifr = await import("exifr");
      const exifData = await exifr.default.parse(imagePath);

      if (exifData && exifData.ImageWidth && exifData.ImageLength) {
        return {
          width: exifData.ImageWidth,
          height: exifData.ImageLength,
        };
      }

      return null;
    } catch (error) {
      console.log(`EXIF extraction failed for ${imagePath}:`, error);
      return null;
    }
  }

  /**
   * Try to extract dimensions from file headers for common formats
   */
  private static async getDimensionsFromHeader(imagePath: string): Promise<{ width: number; height: number } | null> {
    try {
      const { readFile } = await import("fs/promises");
      const buffer = await readFile(imagePath);

      // Check for JPEG
      if (buffer[0] === 0xff && buffer[1] === 0xd8) {
        return this.parseJpegDimensions(buffer);
      }

      // Check for PNG
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        return this.parsePngDimensions(buffer);
      }

      // Check for GIF
      if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
        return this.parseGifDimensions(buffer);
      }

      return null;
    } catch (error) {
      console.log(`Header parsing failed for ${imagePath}:`, error);
      return null;
    }
  }

  /**
   * Parse JPEG dimensions from file header
   */
  private static parseJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
    try {
      let offset = 2; // Skip SOI marker

      while (offset < buffer.length - 1) {
        if (buffer[offset] !== 0xff) break;

        const marker = buffer[offset + 1];
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          // SOF marker found
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }

        // Skip to next marker
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      }

      return null;
    } catch (error) {
      console.log("JPEG parsing failed:", error);
      return null;
    }
  }

  /**
   * Parse PNG dimensions from file header
   */
  private static parsePngDimensions(buffer: Buffer): { width: number; height: number } | null {
    try {
      // PNG dimensions are at offset 16-23 (width at 16-19, height at 20-23)
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    } catch (error) {
      console.log("PNG parsing failed:", error);
      return null;
    }
  }

  /**
   * Parse GIF dimensions from file header
   */
  private static parseGifDimensions(buffer: Buffer): { width: number; height: number } | null {
    try {
      // GIF dimensions are at offset 6-9 (width at 6-7, height at 8-9)
      const width = buffer.readUInt16LE(6);
      const height = buffer.readUInt16LE(8);
      return { width, height };
    } catch (error) {
      console.log("GIF parsing failed:", error);
      return null;
    }
  }

  /**
   * Estimate dimensions based on file size (very rough approximation)
   */
  private static async estimateDimensionsFromFileSize(imagePath: string): Promise<{ width: number; height: number }> {
    try {
      const { stat } = await import("fs/promises");
      const stats = await stat(imagePath);
      const fileSize = stats.size;

      // Very rough estimation: assume 3 bytes per pixel for most formats
      const estimatedPixels = Math.sqrt(fileSize / 3);
      const estimatedDimension = Math.round(estimatedPixels);

      // Return a reasonable aspect ratio (16:9 landscape)
      return {
        width: Math.round((estimatedDimension * 16) / 9),
        height: estimatedDimension,
      };
    } catch (error) {
      console.log("File size estimation failed:", error);
      // Return standard dimensions as final fallback
      return { width: 1920, height: 1080 };
    }
  }

  /**
   * Categorize aspect ratio into Landscape, Portrait, or Square
   */
  private static categorizeAspectRatio(aspectRatio: number): "Landscape" | "Portrait" | "Square" {
    const ratio = Math.abs(aspectRatio - 1);

    if (ratio <= this.ASPECT_RATIO_THRESHOLD) {
      return "Square";
    } else if (aspectRatio > 1) {
      return "Landscape";
    } else {
      return "Portrait";
    }
  }
}
