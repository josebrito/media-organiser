# Media Organiser

A Raycast extension that sorts photos and videos in folders according to their capture date.

## Features

This extension provides a two-step wizard to organize your media files:

### Step 1: Configuration

- **Source Folder**: Select the folder containing your media files (mandatory)
- **Destination Folder**: Choose where to save organized files
  - Option to use the same folder as source (enabled by default)
  - Custom destination folder selection when unchecked
- **Move Files**: Toggle to move files instead of copying them
- **Date Extraction**: Scans the source folder to find all distinct creation dates

### Step 2: Project Assignment

- **Project Names**: Assign a project name to each distinct creation date found
- **File Organization**: Automatically organize files based on your project assignments
- **File Renaming**: Files are renamed according to the project name and date

## Usage

1. Open Raycast and search for "Organise media"
2. Select the command to start the wizard
3. Follow the two-step process:
   - Configure source/destination folders and options
   - Assign project names to each date
4. Files will be organized and renamed automatically

## Development

### Project Structure

```
src/
├── components/
│   ├── Step1Form.tsx    # Source/destination configuration
│   └── Step2Form.tsx    # Project name assignment
├── services/
│   └── mediaService.ts  # File operations (currently mocked)
├── types.ts             # TypeScript interfaces
└── organise-media.tsx   # Main component
```

### Current Implementation

- **Mock Services**: The extension currently uses dummy data for demonstration
- **Real Implementation**: Replace the mock services in `mediaService.ts` with actual file system operations
- **File Types**: Supports common media formats (photos and videos)

### Building and Testing

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Lint and fix
npm run lint
npm run fix-lint
```

## Future Enhancements

- Real file system integration
- Support for additional media formats
- Batch processing options
- Custom naming patterns
- Preview before organization

## License

MIT
