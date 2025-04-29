import hashlib
import logging
import os
import shutil
from io import BufferedReader
from typing import List

from logic.img import generate_thumbnail
from persistence.database import instance as db_instance
from persistence.database import Database
from persistence.schema import Receipt

RECEIPT_DIR = "/data/receipts"

logger = logging.getLogger("receep")


def get_reader_info(reader: BufferedReader, chunk_size=8192):
    """
    Get file size and SHA-256 hash without high memory usage.
    """
    start_pos = reader.tell()  # Save the initial position

    sha256_hash = hashlib.sha256()
    file_size = 0  # Initialize file size counter

    while chunk := reader.read(chunk_size):  # Read file in chunks
        sha256_hash.update(chunk)
        file_size += len(chunk)  # Count bytes processed

    reader.seek(start_pos)  # Restore the original position

    return file_size, sha256_hash.hexdigest()


class Receep:
    def __init__(self, db: Database):
        self.db = db
        for dir in (RECEIPT_DIR,):
            if not os.path.exists(dir):
                os.makedirs(dir, exist_ok=True)

    def upload(self, user_id: int, content_type: str, buffered_reader: BufferedReader) -> Receipt:
        content_length, hash = get_reader_info(buffered_reader)
        logger.info(f"{content_type=}, {content_length=}, {hash=}")
        receipt = self.db.create_receipt(
            user_id, content_type, content_length, hash)

        # ".dr" stands for "Receep Receipt"
        save_path = os.path.join(RECEIPT_DIR, f"{receipt.id}.dr")
        try:
            with open(save_path, "wb") as fp:
                shutil.copyfileobj(buffered_reader, fp)
            generate_thumbnail(source_path=save_path,
                               content_type=content_type)
        except Exception as e:
            self.db.delete_receipt(receipt.id, user_id)
            raise

        return receipt

    def merge_receipts(self, username: str, receipt_ids: List[str]):
        """
        Merge multiple receipts into one PDF. Each existing receipt becomes a page (or pages) in the resulting PDF.
        TODO: ensure the resolutions of all pages are similar.
        """
        raise NotImplementedError


instance = Receep(db_instance)
