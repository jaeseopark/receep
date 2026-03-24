import os
from typing import Callable, Tuple

from pdf2image import convert_from_path
from PIL import Image, ImageOps

DEFAULT_THUMBNAIL_SIZE = (200, 200)  # Set the thumbnail size (width, height)


def _get_thumb_path(path):
    base, ext = os.path.splitext(path)
    return f"{base}-thumb{ext}"


def _normalize_jpeg_mode(img: Image.Image) -> Image.Image:
    if img.mode in ("1", "L", "RGB", "CMYK", "YCbCr"):
        return img
    if img.mode == "LA":
        return img.convert("L")
    return img.convert("RGB")


def _process_image(source_path, output_path, thumb_size):
    with Image.open(source_path) as source_img:
        img = ImageOps.exif_transpose(source_img)
        img.thumbnail(thumb_size)
        save_kwargs = {"quality": 70}
        exif = img.getexif()
        if exif:
            save_kwargs["exif"] = exif.tobytes()
        _normalize_jpeg_mode(img).save(output_path, "JPEG", **save_kwargs)


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
        Image thumbnails are saved as JPEG and preserve grayscale where possible.
    """
    output_path = _get_thumb_path(source_path)
    for match, func in PROCESSOR_MAPPING:
        if match(content_type):
            func(source_path, output_path, thumb_size)
            return

    raise RuntimeError(
        f"Thumbnial processor for the given content type not found. {content_type=}")
