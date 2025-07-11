#!/usr/bin/env python3

import os
import sys
import json
import shutil
import logging
from datetime import datetime
from pathlib import Path
from typing import Set, Tuple, Optional, Dict
from dataclasses import dataclass
from logging.handlers import RotatingFileHandler

import click
from PIL import Image, ExifTags
import rawpy
from dateutil import parser
from tqdm import tqdm
from pymediainfo import MediaInfo

@dataclass
class Config:
    """Configuration for the image processing script."""
    image_extensions: Set[str]
    max_project_name_length: int
    dry_run: bool
    move_files: bool
    name: Optional[str] = None
    source_folder: Optional[str] = None
    destination_folder: Optional[str] = None

    @classmethod
    def from_file(cls, config_path: Path) -> 'Config':
        """Load configuration from a JSON file."""
        with open(config_path) as f:
            data = json.load(f)
        return cls(
            image_extensions=set(data['image_extensions']),
            max_project_name_length=data['max_project_name_length'],
            dry_run=data.get('dry_run', False),
            move_files=data.get('move_files', False),
            name=data.get('name'),
            source_folder=data.get('source_folder'),
            destination_folder=data.get('destination_folder')
        )

    @classmethod
    def default(cls) -> 'Config':
        """Create default configuration."""
        return cls(
            image_extensions={
                '.jpg', '.jpeg', '.raf', '.raw', '.cr2', '.nef', '.arw', '.gpr',
                '.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v'
            },
            max_project_name_length=50,
            dry_run=False,
            move_files=False,
            name=None,
            source_folder=None,
            destination_folder=None
        )

class ImageProcessingError(Exception):
    """Base exception for image processing errors."""
    pass

class DiskSpaceError(ImageProcessingError):
    """Raised when there's not enough disk space."""
    pass

class PermissionError(ImageProcessingError):
    """Raised when there are permission issues."""
    pass

def setup_logging(log_file: Path) -> None:
    """Set up logging configuration."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            RotatingFileHandler(log_file, maxBytes=1024*1024, backupCount=5),
            logging.StreamHandler()
        ]
    )

def has_enough_disk_space(src: Path, dst: Path) -> bool:
    """Check if there's enough disk space to copy the file."""
    try:
        src_size = src.stat().st_size
        # Use the parent directory for disk space check
        dst_free = shutil.disk_usage(dst.parent).free
        return dst_free > src_size
    except Exception as e:
        logging.error(f"Error checking disk space: {e}")
        return False

def can_write_to_directory(directory: Path) -> bool:
    """Check if we have write permissions for the directory."""
    try:
        test_file = directory / '.write_test'
        test_file.touch()
        test_file.unlink()
        return True
    except Exception:
        return False

def find_config_file() -> Optional[Path]:
    """Automatically find config.json or config.local.json in the current directory."""
    current_dir = Path.cwd()
    config_files = ['config.local.json', 'config.json']
    
    for config_file in config_files:
        config_path = current_dir / config_file
        if config_path.exists():
            return config_path
    
    return None

def get_exif_date(img: Image.Image, image_path: Path) -> Optional[datetime]:
    """Extract date from EXIF data using proper EXIF tags."""
    try:
        exif = img.getexif()
        if not exif:
            click.echo(f"No EXIF data found in {image_path.name}", err=True)
            return None

        # Map of EXIF tags to their names for debugging
        exif_tags = {ExifTags.TAGS.get(tag, tag): value for tag, value in exif.items()}
        
        # Debug: Print all EXIF tags
        click.echo(f"\nEXIF data for {image_path.name}:", err=True)
        for tag, value in exif_tags.items():
            if isinstance(tag, str) and 'date' in tag.lower():
                click.echo(f"  {tag}: {value}", err=True)
        
        # Try different EXIF date fields in order of preference
        date_fields = [
            'DateTimeOriginal',  # When the image was taken
            'DateTimeDigitized', # When the image was digitized
            'DateTime',          # When the file was modified
        ]
        
        for field in date_fields:
            if field in exif_tags:
                value = exif_tags[field]
                if value and str(value).strip():  # Only use if not empty
                    try:
                        # EXIF dates are typically in format: YYYY:MM:DD HH:MM:SS
                        date_str = str(value).replace(':', ' ', 2)  # Replace first two colons with spaces
                        parsed_date = parser.parse(date_str)
                        click.echo(f"  Using {field} date: {parsed_date}", err=True)
                        return parsed_date
                    except (ValueError, TypeError) as e:
                        click.echo(f"  Error parsing {field} date: {e}", err=True)
                        continue
    except Exception as e:
        click.echo(f"Error reading EXIF from {image_path.name}: {str(e)}", err=True)
    return None

def get_image_date(image_path: Path) -> datetime:
    """
    Extract the date from an image or video file using:
    1. EXIF data (for JPEG and other formats)
    2. RAW metadata (for RAW files)
    3. Video metadata (for video files)
    4. File creation date (fallback)
    """
    try:
        ext = image_path.suffix.lower()
        # RAW files (including .gpr)
        if ext in ['.raf', '.gpr', '.raw', '.cr2', '.nef', '.arw']:
            try:
                with rawpy.imread(str(image_path)) as raw:
                    if hasattr(raw, 'metadata') and raw.metadata:
                        if hasattr(raw.metadata, 'datetime_original') and raw.metadata.datetime_original:
                            date = parser.parse(raw.metadata.datetime_original)
                            click.echo(f"RAW metadata date for {image_path.name}: {date}", err=True)
                            return date
            except Exception as e:
                if ext == '.gpr':
                    click.echo(f"Note: .GPR files are not fully supported for metadata extraction. Using file creation date for {image_path.name}.", err=True)
                else:
                    click.echo(f"Warning: Could not extract RAW metadata from {image_path}: {str(e)}", err=True)
        # Regular images
        elif ext in ['.jpg', '.jpeg']:
            with Image.open(image_path) as img:
                exif_date = get_exif_date(img, image_path)
                if exif_date:
                    return exif_date
        # Video files
        elif ext in ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v']:
            try:
                media_info = MediaInfo.parse(str(image_path))
                for track in media_info.tracks:
                    if track.track_type == 'General':
                        # Try various date fields
                        for field in [
                            'encoded_date', 'tagged_date', 'file_last_modification_date',
                            'file_creation_date', 'file_last_modification_date__local',
                            'file_creation_date__local', 'other_file_creation_date', 'other_file_last_modification_date']:
                            value = getattr(track, field, None)
                            if value:
                                # Sometimes value is a list
                                if isinstance(value, list):
                                    value = value[0]
                                try:
                                    date = parser.parse(str(value))
                                    click.echo(f"Video metadata date for {image_path.name}: {date}", err=True)
                                    return date
                                except Exception as e:
                                    click.echo(f"  Error parsing video {field}: {e}", err=True)
                                    continue
            except Exception as e:
                click.echo(f"Warning: Could not extract video metadata from {image_path}: {str(e)}", err=True)
        # Fallback to file creation date
        date = datetime.fromtimestamp(image_path.stat().st_birthtime)
        click.echo(f"Using file creation date for {image_path.name}: {date}", err=True)
        return date
    except Exception as e:
        click.echo(f"Warning: Could not get creation date for {image_path}: {str(e)}", err=True)
        return datetime.now()

def safe_copy_file(src: Path, dst: Path, config: Config) -> None:
    """Safely copy or move a file with proper error handling."""
    if config.dry_run:
        logging.info(f"Would {'move' if config.move_files else 'copy'} {src} to {dst}")
        return

    try:
        # Check available disk space
        if not has_enough_disk_space(src, dst):
            raise DiskSpaceError(f"Not enough disk space to copy {src}")

        # Check permissions
        if not can_write_to_directory(dst.parent):
            raise PermissionError(f"Cannot write to {dst.parent}")

        # Create parent directory if it doesn't exist
        dst.parent.mkdir(parents=True, exist_ok=True)

        # Copy or move the file
        if config.move_files:
            shutil.move(src, dst)
            logging.info(f"Moved {src} to {dst}")
        else:
            shutil.copy2(src, dst)
            logging.info(f"Copied {src} to {dst}")

    except Exception as e:
        logging.error(f"Error processing {src}: {e}")
        raise

def get_image_files(source_dir: Path, config: Config) -> Set[Path]:
    """Find all image files in the source directory and its subdirectories."""
    try:
        return {
            f for f in source_dir.rglob('*')
            if f.is_file() and f.suffix.lower() in config.image_extensions
        }
    except Exception as e:
        logging.error(f"Error scanning directory {source_dir}: {e}")
        raise

def get_project_names_for_all_dates(dates: Set[datetime], config: Config) -> Dict[str, str]:
    """Prompt user for project names for all unique dates at once."""
    if config.name:
        # If a global name is provided, use it for all dates
        return {date.strftime('%Y%m%d'): config.name for date in dates}
    
    project_names: Dict[str, str] = {}
    
    # Sort dates for consistent ordering
    sorted_dates = sorted(dates)
    
    click.echo(f"\nFound {len(sorted_dates)} unique dates. Please provide project names for each:")
    
    for date in sorted_dates:
        date_str = date.strftime('%Y%m%d')
        while True:
            project_name = click.prompt(
                f"Enter project name for date {date.strftime('%Y-%m-%d')}",
                type=str
            )
            if len(project_name) > config.max_project_name_length:
                click.echo(f"Project name too long. Maximum length is {config.max_project_name_length} characters.")
                continue
            if not project_name.strip():
                click.echo("Project name cannot be empty.")
                continue
            project_names[date_str] = project_name
            break
    
    return project_names

def create_date_folder(base_dir: Path, date: datetime, project_name: str, config: Config) -> Path:
    """Create a folder named YYYYMMDD_PROJECT_NAME in the base directory."""
    try:
        date_folder = base_dir / f"{date.strftime('%Y%m%d')}_{project_name}"
        if not config.dry_run:
            date_folder.mkdir(exist_ok=True)
        logging.info(f"Created/accessed folder: {date_folder}")
        return date_folder
    except Exception as e:
        logging.error(f"Error creating folder {date_folder}: {e}")
        raise

@click.group()
def cli():
    """Photo grouping utility."""
    pass

@cli.command('extract-dates')
@click.argument('source_folder', type=click.Path(exists=True, file_okay=False, dir_okay=True), required=True)
def extract_dates(source_folder):
    """Extract unique creation dates from files in SOURCE_FOLDER and output as JSON."""
    config_obj = Config.default()
    source_path = Path(source_folder)
    image_files = get_image_files(source_path, config_obj)
    unique_dates = set()
    for image_file in image_files:
        try:
            image_date = get_image_date(image_file)
            date_only = image_date.replace(hour=0, minute=0, second=0, microsecond=0)
            date_str = date_only.strftime('%Y%m%d')
            unique_dates.add(date_str)
        except Exception:
            continue
    click.echo(json.dumps(sorted(unique_dates)))

@cli.command('group')
@click.argument('source_folder', type=click.Path(exists=True, file_okay=False, dir_okay=True), required=True)
@click.argument('destination_folder', type=click.Path(file_okay=False, dir_okay=True), required=True)
@click.option('--move', is_flag=True, help='Move files instead of copying')
@click.option('--mapping', type=click.Path(exists=True, dir_okay=False, file_okay=True), required=True, help='Path to JSON file mapping date (YYYYMMDD) to project name')
def group_files(source_folder, destination_folder, move, mapping):
    """Group and move/copy files based on date→project mapping."""
    config_obj = Config.default()
    config_obj.move_files = move
    source_path = Path(source_folder)
    dest_path = Path(destination_folder)
    with open(mapping) as f:
        project_names = json.load(f)
    image_files = get_image_files(source_path, config_obj)
    file_date_mapping = {}
    for image_file in image_files:
        try:
            image_date = get_image_date(image_file)
            file_date_mapping[image_file] = image_date
        except Exception:
            continue
    for image_file, image_date in file_date_mapping.items():
        date_only = image_date.replace(hour=0, minute=0, second=0, microsecond=0)
        date_str = date_only.strftime('%Y%m%d')
        project_name = project_names.get(date_str)
        if not project_name:
            continue  # skip files with no mapping
        date_folder = create_date_folder(dest_path, image_date, project_name, config_obj)
        new_filename = f"{date_folder.name}_{image_file.name}"
        dest_file = date_folder / new_filename
        counter = 1
        while dest_file.exists():
            dest_file = date_folder / f"{date_folder.name}_{image_file.stem}_{counter}{image_file.suffix}"
            counter += 1
        safe_copy_file(image_file, dest_file, config_obj)
    click.echo("Processing completed")

if __name__ == '__main__':
    cli() 