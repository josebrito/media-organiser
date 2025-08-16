# Media Organiser

A Raycast extension that helps organize media files by different criteria.

## Features

### Group by Capture Date

- Organizes photos and videos in folders according to their capture date
- Supports both copy and move operations
- Optional file renaming
- Recursive folder scanning
- Saves last used configuration

### Group by Aspect Ratio

- Analyzes image files and categorizes them by aspect ratio
- Creates three categories: Landscape, Portrait, and Square
- Supports both copy and move operations
- **Images only** - does not process video files
- Recursive folder scanning
- Saves last used configuration

## Commands

### 1. Group by Capture Date

Organizes media files (photos and videos) into folders based on their capture date. Files are grouped by date and can be organized into project-specific folders.

**Features:**

- Select source and destination folders
- Choose between copy or move operations
- Optional file renaming
- Project assignment for each date
- Recursive folder scanning

### 2. Group by Aspect Ratio

Organizes image files into folders based on their aspect ratio. Images are categorized as Landscape, Portrait, or Square and placed in corresponding subfolders.

**Features:**

- Select source and destination folders
- Choose between copy or move operations
- **No file renaming option** - original filenames are always preserved
- Automatic aspect ratio detection using image metadata
- Creates three subfolders: Landscape, Portrait, Square
- Recursive folder scanning

## Supported File Types

### Group by Capture Date

- Photos: JPG, JPEG, PNG, GIF, BMP, TIFF, WebP
- Videos: MP4, MOV, AVI, MKV, and other common video formats

### Group by Aspect Ratio

- **Images only**: JPG, JPEG, PNG, GIF, BMP, TIFF, WebP
- Videos are not supported for aspect ratio analysis

## Installation

1. Install the extension from the Raycast Store
2. Use the command palette to search for "Media Organiser"
3. Choose your desired command

## Usage

### Step 1: Configuration

1. Select the source folder containing your media files
2. Choose whether the destination is the same as the source
3. If different, select a destination folder
4. Choose whether to move or copy files
5. For capture date grouping, choose whether to rename files

### Step 2: Processing

- **Capture Date**: Review extracted dates and assign project names
- **Aspect Ratio**: Images are automatically analyzed and organized immediately

## Technical Details

- Uses `exifr` for extracting image dimensions from EXIF metadata
- Implements fallback methods for image dimension detection:
  - EXIF data extraction (most accurate)
  - File header parsing for JPEG, PNG, and GIF formats
  - File size estimation as final fallback
- Uses `exifr` for extracting metadata from media files
- Recursively scans folders for media files
- Supports both copy and move operations
- Configuration is automatically saved for future use

## Requirements

- macOS 10.15 or later
- Raycast 1.0 or later

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Fix linting issues
npm run fix-lint
```

## License

MIT
