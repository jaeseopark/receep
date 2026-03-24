import hashlib
import importlib.util
import io
import sys
import tempfile
import types
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from PIL import Image


API_ROOT = Path(__file__).resolve().parents[1]


def load_receep_module():
    database_module = types.ModuleType("persistence.database")
    database_module.Database = object
    database_module.instance = object()

    schema_module = types.ModuleType("persistence.schema")
    schema_module.Receipt = object

    persistence_package = types.ModuleType("persistence")
    persistence_package.__path__ = []

    module_path = API_ROOT / "logic" / "receep.py"
    spec = importlib.util.spec_from_file_location("receep_under_test", module_path)
    module = importlib.util.module_from_spec(spec)

    if str(API_ROOT) not in sys.path:
        sys.path.insert(0, str(API_ROOT))

    with mock.patch.dict(
        sys.modules,
        {
            "persistence": persistence_package,
            "persistence.database": database_module,
            "persistence.schema": schema_module,
        },
    ), mock.patch("os.path.exists", return_value=True), mock.patch("os.makedirs"):
        assert spec.loader is not None
        spec.loader.exec_module(module)

    return module


class FakeReceiptDb:
    def __init__(self, receipt_id=123):
        self.receipt = SimpleNamespace(id=receipt_id)
        self.create_calls = []
        self.delete_calls = []

    def create_receipt(self, user_id, content_type, content_length, content_hash):
        self.create_calls.append((user_id, content_type, content_length, content_hash))
        return self.receipt

    def delete_receipt(self, receipt_id, user_id):
        self.delete_calls.append((receipt_id, user_id))


class ReceepUploadTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.receep_module = load_receep_module()

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.receipts_dir = Path(self.temp_dir.name)
        self.original_receipt_dir = self.receep_module.RECEIPT_DIR
        self.receep_module.RECEIPT_DIR = str(self.receipts_dir)
        self.addCleanup(self._restore_receipt_dir)

    def _restore_receipt_dir(self):
        self.receep_module.RECEIPT_DIR = self.original_receipt_dir

    def _build_image_bytes(self, mode, size, image_format, **save_kwargs):
        buffer = io.BytesIO()
        Image.new(mode, size, color=128 if mode in ("L", "LA") else (255, 0, 0, 128)).save(
            buffer,
            format=image_format,
            **save_kwargs,
        )
        return buffer.getvalue()

    def test_upload_persists_original_file_and_generates_thumbnail(self):
        db = FakeReceiptDb(receipt_id=77)
        app = self.receep_module.Receep(db)
        original_bytes = self._build_image_bytes("L", (640, 320), "JPEG")
        reader = io.BytesIO(original_bytes)

        receipt = app.upload(user_id=9, content_type="image/jpeg", buffered_reader=reader)

        expected_hash = hashlib.sha256(original_bytes).hexdigest()
        self.assertIs(receipt, db.receipt)
        self.assertEqual(db.create_calls, [(9, "image/jpeg", len(original_bytes), expected_hash)])
        self.assertEqual(db.delete_calls, [])

        saved_path = self.receipts_dir / "77.dr"
        thumb_path = self.receipts_dir / "77-thumb.dr"
        self.assertEqual(saved_path.read_bytes(), original_bytes)
        self.assertTrue(thumb_path.exists())

        with Image.open(thumb_path) as thumbnail:
            self.assertEqual(thumbnail.format, "JPEG")
            self.assertEqual(thumbnail.mode, "L")
            self.assertEqual(thumbnail.size, (200, 100))

    def test_upload_deletes_receipt_record_when_thumbnail_generation_fails(self):
        db = FakeReceiptDb(receipt_id=88)
        app = self.receep_module.Receep(db)
        original_bytes = self._build_image_bytes("L", (64, 64), "JPEG")
        reader = io.BytesIO(original_bytes)

        with mock.patch.object(self.receep_module, "generate_thumbnail", side_effect=RuntimeError("boom")):
            with self.assertRaisesRegex(RuntimeError, "boom"):
                app.upload(user_id=5, content_type="image/jpeg", buffered_reader=reader)

        self.assertEqual(db.delete_calls, [(88, 5)])
        self.assertEqual((self.receipts_dir / "88.dr").read_bytes(), original_bytes)


if __name__ == "__main__":
    unittest.main()