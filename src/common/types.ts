export interface MediaFile {
  path: string;
  name: string;
  creationDate: Date;
  extension: string;
}

export interface Configuration {
  sourceFolder: string;
  destinationFolder: string;
  moveFiles: boolean;
  sameAsSource: boolean;
  renameFiles: boolean;
}

export interface ProjectAssignment {
  date: Date;
  projectName: string;
}

export interface DateExtractionResult {
  dates: Date[];
  files: MediaFile[];
}

export interface OrganizationResult {
  success: boolean;
  message: string;
  processedFiles: number;
}

// New types for aspect ratio grouping
export interface ImageFile {
  path: string;
  name: string;
  extension: string;
  width: number;
  height: number;
  aspectRatio: number;
  category: "Landscape" | "Portrait" | "Square";
}

export interface AspectRatioResult {
  images: ImageFile[];
  categories: {
    Landscape: number;
    Portrait: number;
    Square: number;
  };
}

// New types for bulk rename functionality
export interface BulkRenameConfig {
  sourceFolder: string;
  prefix: string;
  suffix: string;
  includeOriginalName: boolean;
}

export interface BulkRenameResult {
  success: boolean;
  message: string;
  processedFiles: number;
  renamedFiles: string[];
}
