# Media Organiser

A Raycast extension for organizing photos and videos by their capture date.

## Features

- **EXIF Metadata Extraction**: Extracts creation dates from images using EXIF data
- **RAW File Support**: Handles camera RAW formats (RAF, CR2, NEF, ARW, etc.)
- **Video Metadata**: Extracts dates from video files (MP4, MOV, AVI, etc.)
- **File Organization**: Groups files into date-based folders with project names (eg. `20250714_PORTO_TRIP`)
- **File Naming**: Option to rename files with project prefix (eg. `20250714_PORTO_TRIP_<ORIGINAL_NAME>.jpg`) or keep original names

## Usage

### Raycast Extension

1. Open Raycast
2. Search for "Organise Media"
3. Select source and destination folders
4. Assign project names to dates

## Architecture

### Supported File Types

**Images:**

- JPEG (.jpg, .jpeg) - EXIF metadata extraction
- RAW formats (.raf, .raw, .cr2, .nef, .arw, .gpr) - Uses `exifr` for metadata extraction

**Videos:**

- MP4, MOV, AVI, MKV, WMV, FLV, WebM, M4V - Uses `ffprobe` for metadata extraction

### Date Extraction Priority

1. **EXIF DateTimeOriginal** (when image was taken)
2. **EXIF DateTimeDigitized** (when image was digitized)
3. **EXIF DateTime** (when file was modified)
4. **RAW metadata** (for RAW files)
5. **Video metadata** (for video files)
6. **File creation date** (fallback)

## Development

### Install Dependencies

```bash
npm install
```

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

## License

MIT
