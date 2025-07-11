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
