import os
from typing import Callable, Tuple
from PIL import Image
from pdf2image import convert_from_path

DEFAULT_THUMBNAIL_SIZE = (200, 200)  # Set the thumbnail size (width, height)


def _get_thumb_path(path):
    base, ext = os.path.splitext(path)
    return f"{base}-thumb{ext}"


def _process_image(source_path, output_path, thumb_size):
    with Image.open(source_path) as img:
        img.thumbnail(thumb_size)
        img.convert("RGB").save(output_path, "JPEG", quality=70)


def _process_pdf(source_path, output_path: str, thumb_size: Tuple[int, int]):
    images = convert_from_path(source_path, dpi=150, first_page=1, last_page=1)
    if not images:
        raise RuntimeError("Conversion failed")

    images[0].thumbnail(thumb_size)
    images[0].convert("RGB").save(output_path, "JPEG", quality=70)


PROCESSOR_MAPPING: Tuple[Callable[[str], Callable[[str, str, Tuple[int, int]], None]]] = [
    (lambda content_type: content_type.startswith("image/"), _process_image),
    (lambda content_type: content_type == "application/pdf", _process_pdf)
]


def generate_thumbnail(content_type: str, source_path: str, thumb_size: Tuple[int, int] = DEFAULT_THUMBNAIL_SIZE):
    """
    Generates a thumbnail next to the source file. See example below:
        * Source path: /receipts/1.dr
        * Thumbnail path: /receipts/1-thumb.dr
        Supported content types: image/*, application/pdf
    """
    output_path = _get_thumb_path(source_path)
    for match, func in PROCESSOR_MAPPING:
        if match(content_type):
            func(source_path, output_path, thumb_size)
            return
    
    raise RuntimeError(f"Thumbnial processor for the given content type not found. {content_type=}")
