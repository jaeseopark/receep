import { Receipt, Transaction } from "@/types";

export const getThumbnailPath = (receiptId: number) => `/${receiptId}-thumb.dr`;
export const getHighresPath = (receiptId: number) => `/${receiptId}.dr`;

const CONTENT_TYPE_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

export const getExtFromContentType = (contentType: string): string => {
  return CONTENT_TYPE_TO_EXT[contentType] ?? "bin";
};

export const getDownloadFilename = (receipt: Receipt, transaction?: Transaction): string => {
  const ext = getExtFromContentType(receipt.content_type);
  const tx = transaction ?? receipt.transactions[0];
  if (!tx) {
    return `receep-attachment.${ext}`;
  }
  const date = new Date(tx.timestamp * 1000).toISOString().split("T")[0];
  return `receep-attachment-${date}-tx${tx.id}.${ext}`;
};
