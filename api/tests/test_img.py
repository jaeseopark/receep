import tempfile
import unittest
from pathlib import Path

from PIL import Image

from logic.img import generate_thumbnail


class GenerateThumbnailTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.temp_path = Path(self.temp_dir.name)

    def test_grayscale_jpeg_without_exif_generates_grayscale_thumbnail(self):
        source_path = self.temp_path / "grayscale.dr"
        Image.new("L", (640, 320), color=128).save(source_path, format="JPEG")

        generate_thumbnail("image/jpeg", str(source_path), thumb_size=(200, 200))

        thumb_path = self.temp_path / "grayscale-thumb.dr"
        self.assertTrue(thumb_path.exists())
        with Image.open(thumb_path) as thumbnail:
            self.assertEqual(thumbnail.format, "JPEG")
            self.assertEqual(thumbnail.mode, "L")
            self.assertEqual(thumbnail.size, (200, 100))

    def test_rgba_png_generates_rgb_thumbnail(self):
        source_path = self.temp_path / "alpha.dr"
        Image.new("RGBA", (120, 120), color=(255, 0, 0, 128)).save(source_path, format="PNG")

        generate_thumbnail("image/png", str(source_path), thumb_size=(60, 60))

        thumb_path = self.temp_path / "alpha-thumb.dr"
        self.assertTrue(thumb_path.exists())
        with Image.open(thumb_path) as thumbnail:
            self.assertEqual(thumbnail.format, "JPEG")
            self.assertEqual(thumbnail.mode, "RGB")
            self.assertEqual(thumbnail.size, (60, 60))

    def test_unsupported_content_type_raises_runtime_error(self):
        source_path = self.temp_path / "receipt.dr"
        source_path.write_bytes(b"plain-text")

        with self.assertRaisesRegex(RuntimeError, "processor"):
            generate_thumbnail("text/plain", str(source_path))


if __name__ == "__main__":
    unittest.main()