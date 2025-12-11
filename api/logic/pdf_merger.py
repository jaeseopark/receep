"""
PDF and image merging utilities for receipt management.

This module handles merging receipts (PDFs and images) while preserving
quality and honoring existing DPI settings.
"""

import hashlib
import logging
import os
import tempfile
from io import BytesIO
from typing import List, Tuple

from PIL import Image
from pdf2image import convert_from_path
from pypdf import PdfReader, PdfWriter

logger = logging.getLogger("receep")


class PDFMergerConfig:
    """Configuration for PDF merging operations."""
    DEFAULT_DPI = 150
    MAX_WIDTH = 800  # pixels for screen viewing
    MARGIN = 20  # pixels
    JPEG_QUALITY = 95  # High quality to minimize compression loss


def get_file_info(file_path: str) -> Tuple[int, str]:
    """
    Get file size and SHA-256 hash.
    
    Args:
        file_path: Path to the file
        
    Returns:
        Tuple of (file_size, hash_hex)
    """
    sha256_hash = hashlib.sha256()
    file_size = 0
    
    with open(file_path, 'rb') as f:
        while chunk := f.read(8192):
            sha256_hash.update(chunk)
            file_size += len(chunk)
    
    return file_size, sha256_hash.hexdigest()


def extract_pdf_metadata(pdf_path: str) -> dict:
    """
    Extract metadata from a PDF file.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        Dictionary containing page_count, avg_width, avg_height, dpi
    """
    reader = PdfReader(pdf_path)
    page_count = len(reader.pages)
    
    if page_count == 0:
        return {
            'page_count': 0,
            'avg_width': 0,
            'avg_height': 0,
            'dpi': PDFMergerConfig.DEFAULT_DPI
        }
    
    # Get dimensions from first page (in points, 1 point = 1/72 inch)
    first_page = reader.pages[0]
    mediabox = first_page.mediabox
    width_points = float(mediabox.width)
    height_points = float(mediabox.height)
    
    # Convert points to inches and estimate DPI
    # This is an approximation; actual DPI may vary
    width_inches = width_points / 72.0
    
    # Estimate DPI based on typical receipt widths
    # Assuming most receipts are around 3-4 inches wide
    estimated_dpi = PDFMergerConfig.DEFAULT_DPI
    if width_inches > 0:
        # Use a reasonable pixel width assumption
        pixel_width = PDFMergerConfig.MAX_WIDTH
        estimated_dpi = int(pixel_width / width_inches)
    
    return {
        'page_count': page_count,
        'avg_width': width_points,
        'avg_height': height_points,
        'dpi': estimated_dpi
    }


def normalize_image(image: Image.Image, target_width: int = None, add_margins: bool = True) -> Image.Image:
    """
    Normalize an image to consistent dimensions and margins.
    
    Args:
        image: PIL Image object
        target_width: Target width in pixels (None to keep original)
        add_margins: Whether to add margins
        
    Returns:
        Normalized PIL Image
    """
    # Resize if target_width is specified
    if target_width and image.width != target_width:
        aspect_ratio = image.height / image.width
        new_height = int(target_width * aspect_ratio)
        image = image.resize((target_width, new_height), Image.Resampling.LANCZOS)
    
    # Add margins
    if add_margins:
        margin = PDFMergerConfig.MARGIN
        new_width = image.width + 2 * margin
        new_height = image.height + 2 * margin
        
        # Create white background
        normalized = Image.new('RGB', (new_width, new_height), 'white')
        normalized.paste(image, (margin, margin))
        return normalized
    
    return image


def image_to_pdf_bytes(image: Image.Image, dpi: int = None) -> bytes:
    """
    Convert a PIL Image to PDF bytes.
    
    Args:
        image: PIL Image object
        dpi: DPI for the PDF (defaults to config default)
        
    Returns:
        PDF file as bytes
    """
    if dpi is None:
        dpi = PDFMergerConfig.DEFAULT_DPI
    
    pdf_buffer = BytesIO()
    
    # Convert to RGB if necessary
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Save as PDF with specified DPI
    image.save(pdf_buffer, format='PDF', resolution=dpi, quality=PDFMergerConfig.JPEG_QUALITY)
    pdf_buffer.seek(0)
    
    return pdf_buffer.getvalue()


def merge_receipts(target_receipt_path: str, source_receipt_path: str, output_path: str) -> Tuple[int, str]:
    """
    Merge source receipt into target receipt, preserving target's settings.
    
    The target receipt (typically a PDF) remains unchanged, and source pages
    are appended. For source images, they are converted to PDF using target's DPI.
    For source PDFs, lossless merging is used.
    
    Args:
        target_receipt_path: Path to target receipt (PDF or image)
        source_receipt_path: Path to source receipt to append (PDF or image)
        output_path: Path where merged PDF should be saved
        
    Returns:
        Tuple of (file_size, hash) for the merged PDF
    """
    logger.info(f"Merging receipts: target={target_receipt_path}, source={source_receipt_path}")
    
    # Determine file types
    target_is_pdf = target_receipt_path.lower().endswith('.pdf') or target_receipt_path.endswith('.dr')
    source_is_pdf = source_receipt_path.lower().endswith('.pdf') or source_receipt_path.endswith('.dr')
    
    # For .dr files, we need to inspect the content type
    # For now, assume they follow the pattern established in the codebase
    
    writer = PdfWriter()
    target_dpi = PDFMergerConfig.DEFAULT_DPI
    
    # Process target receipt
    if target_is_pdf:
        # Extract metadata from target PDF
        metadata = extract_pdf_metadata(target_receipt_path)
        target_dpi = metadata['dpi']
        
        # Add all pages from target PDF without modification
        target_reader = PdfReader(target_receipt_path)
        for page in target_reader.pages:
            writer.add_page(page)
        
        logger.info(f"Added {len(target_reader.pages)} pages from target PDF")
    else:
        # Target is an image - convert to PDF
        target_image = Image.open(target_receipt_path)
        # Normalize and convert to PDF
        normalized_target = normalize_image(target_image, target_width=PDFMergerConfig.MAX_WIDTH)
        target_pdf_bytes = image_to_pdf_bytes(normalized_target, dpi=target_dpi)
        
        # Add to writer
        target_reader = PdfReader(BytesIO(target_pdf_bytes))
        for page in target_reader.pages:
            writer.add_page(page)
        
        logger.info(f"Converted target image to PDF")
    
    # Process source receipt
    if source_is_pdf:
        # Lossless PDF merging
        source_reader = PdfReader(source_receipt_path)
        for page in source_reader.pages:
            writer.add_page(page)
        
        logger.info(f"Added {len(source_reader.pages)} pages from source PDF (lossless)")
    else:
        # Source is an image - convert to PDF using target's DPI
        source_image = Image.open(source_receipt_path)
        
        # Check if normalization is needed (significant dimension difference)
        # For now, always normalize for consistency
        normalized_source = normalize_image(source_image, target_width=PDFMergerConfig.MAX_WIDTH)
        source_pdf_bytes = image_to_pdf_bytes(normalized_source, dpi=target_dpi)
        
        # Add to writer
        source_reader = PdfReader(BytesIO(source_pdf_bytes))
        for page in source_reader.pages:
            writer.add_page(page)
        
        logger.info(f"Converted source image to PDF using target DPI={target_dpi}")
    
    # Write merged PDF
    with open(output_path, 'wb') as output_file:
        writer.write(output_file)
    
    logger.info(f"Merged PDF saved to {output_path}")
    
    # Get file info
    file_size, file_hash = get_file_info(output_path)
    
    return file_size, file_hash


def merge_receipt_to_transaction(
    transaction_receipt_path: str,
    source_receipt_path: str,
    output_path: str
) -> Tuple[int, str]:
    """
    Merge a source receipt into a transaction's existing receipt.
    
    This is a wrapper around merge_receipts with transaction-specific logic.
    
    Args:
        transaction_receipt_path: Path to transaction's receipt
        source_receipt_path: Path to source receipt to append
        output_path: Path where merged PDF should be saved
        
    Returns:
        Tuple of (file_size, hash) for the merged PDF
    """
    return merge_receipts(transaction_receipt_path, source_receipt_path, output_path)
