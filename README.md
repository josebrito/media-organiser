# Media Organiser

A Raycast extension and CLI tool for organizing photos and videos by their capture date. Built with TypeScript/Node.js for optimal performance and integration.

## Features

- **EXIF Metadata Extraction**: Extracts creation dates from JPEG images using EXIF data
- **RAW File Support**: Handles camera RAW formats (RAF, CR2, NEF, ARW, etc.) using exiftool
- **Video Metadata**: Extracts dates from video files (MP4, MOV, AVI, etc.) using ffprobe
- **File Organization**: Groups files into date-based folders with project names
- **Flexible File Naming**: Option to rename files with project prefix or keep original names
- **Safety Checks**: Disk space validation, permission checks, and duplicate filename handling
- **Flexible Operations**: Copy or move files with dry-run support
- **Multiple Interfaces**: Both Raycast extension and standalone CLI

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

### CLI Usage

The CLI provides comprehensive media organization functionality:

#### Extract Dates

Extract unique creation dates from files in a folder:

```bash
npm run cli:extract-dates <source_folder>
```

Example:

```bash
npm run cli:extract-dates /path/to/photos
# Output: ["20231201", "20231202", "20231203"]
```

#### Group Files

Organize files based on date→project mapping:

```bash
npm run cli:group <source_folder> <destination_folder> [options]
```

Options:

- `--move`: Move files instead of copying
- `--no-rename`: Keep original filenames (don't add project prefix)
- `--mapping <file>`: Use JSON file for date→project mapping

Examples:

**Interactive mode** (prompts for project names):

```bash
npm run cli:group /path/to/photos /path/to/organized
```

**Using mapping file**:

```bash
# Create mapping.json
echo '{"20231201": "Vacation", "20231202": "Birthday"}' > mapping.json

# Use mapping file
npm run cli:group /path/to/photos /path/to/organized --mapping mapping.json
```

**Move files instead of copying**:

```bash
npm run cli:group /path/to/photos /path/to/organized --move
```

**Keep original filenames**:

```bash
npm run cli:group /path/to/photos /path/to/organized --no-rename
```

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

3. **CLI Interface** (`src/cli.ts`): Command-line interface
   - Uses Commander.js for argument parsing
   - Interactive prompts with Inquirer.js
   - Colored output with Chalk

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
