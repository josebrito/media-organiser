# Media Organiser

A Raycast extension for organizing photos and videos by their capture date. Built with TypeScript/Node.js for optimal performance and integration.

## Features

- **EXIF Metadata Extraction**: Extracts creation dates from JPEG images using EXIF data
- **RAW File Support**: Handles camera RAW formats (RAF, CR2, NEF, ARW, etc.) using exiftool
- **Video Metadata**: Extracts dates from video files (MP4, MOV, AVI, etc.) using ffprobe
- **File Organization**: Groups files into date-based folders with project names
- **Flexible File Naming**: Option to rename files with project prefix or keep original names
- **Safety Checks**: Disk space validation, permission checks, and duplicate filename handling
- **Flexible Operations**: Copy or move files with dry-run support

## Installation

### Dependencies

The TypeScript implementation requires these system dependencies:

1. **exiftool** (for RAW file metadata extraction):

   ```bash
   # macOS
   brew install exiftool

   # Ubuntu/Debian
   sudo apt-get install exiftool

   # Windows
   # Download from https://exiftool.org/
   ```

2. **ffprobe** (for video metadata extraction):

   ```bash
   # macOS
   brew install ffmpeg

   # Ubuntu/Debian
   sudo apt-get install ffmpeg

   # Windows
   # Download from https://ffmpeg.org/
   ```

### Node.js Dependencies

```bash
npm install
```

## Usage

### Raycast Extension

1. Open Raycast
2. Search for "Organise Media"
3. Select source and destination folders
4. Assign project names to dates
5. Choose to copy or move files

## Architecture

### Core Components

1. **MediaProcessor** (`src/services/mediaProcessor.ts`): Core processing logic
   - File discovery and filtering
   - Metadata extraction (EXIF, RAW, video)
   - File operations with safety checks
   - Date-based organization

2. **MediaService** (`src/services/mediaService.ts`): Raycast integration layer
   - Converts between Raycast types and processor types
   - Handles async operations for UI

### Supported File Types

**Images:**

- JPEG (.jpg, .jpeg) - EXIF metadata extraction
- RAW formats (.raf, .raw, .cr2, .nef, .arw, .gpr) - exiftool metadata extraction

**Videos:**

- MP4, MOV, AVI, MKV, WMV, FLV, WebM, M4V - ffprobe metadata extraction

### Date Extraction Priority

1. **EXIF DateTimeOriginal** (when image was taken)
2. **EXIF DateTimeDigitized** (when image was digitized)
3. **EXIF DateTime** (when file was modified)
4. **RAW metadata** (for RAW files)
5. **Video metadata** (for video files)
6. **File creation date** (fallback)

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Linting

```bash
npm run lint
npm run fix-lint
```

## Configuration

The MediaProcessor supports configuration through the `MediaProcessorConfig` interface:

```typescript
interface MediaProcessorConfig {
  imageExtensions: Set<string>; // Supported file extensions
  maxProjectNameLength: number; // Max length for project names
  dryRun: boolean; // Preview mode without file changes
  moveFiles: boolean; // Move vs copy files
  renameFiles: boolean; // Whether to rename files with project prefix
  name?: string; // Global project name
  sourceFolder?: string; // Source directory
  destinationFolder?: string; // Destination directory
}
```

## Error Handling

The implementation includes comprehensive error handling:

- **Disk Space**: Checks available space before copying
- **Permissions**: Validates write permissions
- **File Conflicts**: Generates unique filenames
- **Metadata Errors**: Graceful fallback to file creation date
- **Missing Dependencies**: Informative error messages for exiftool/ffprobe

## License

MIT
