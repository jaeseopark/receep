import axios from "axios";
import { RotateCwSquare } from "lucide-preact";

import { Receipt } from "@/types";

import { upsertReceipts } from "@/store";

const getThumbnailPath = (receiptId: number) => `/${receiptId}-thumb.dr`;
const getHighresPath = (receiptId: number) => `/${receiptId}.dr`;

const rotate = (receipt_id: number) =>
  axios
    .post(`/api/receipts/${receipt_id}/rotate`)
    .then((r) => r.data)
    .then((receipt) => upsertReceipts({ items: [receipt] }));

const ReceiptImg = ({
  receipt: { id, rotation, content_type },
  pathGetter: getPath,
  contentTypeOverride,
}: {
  receipt: Receipt;
  pathGetter: (id: number) => string;
  contentTypeOverride?: string;
}) => {
  if ((contentTypeOverride || content_type).startsWith("image/")) {
    return <img className="w-full h-auto" style={{ transform: `rotate(${rotation}deg)` }} src={getPath(id)} alt={id} />;
  }

  return <div>PDF currently not supported</div>;
};

export const ReceiptThumbnail = ({ receipt }: { receipt: Receipt }) => (
  <ReceiptImg receipt={receipt} pathGetter={getThumbnailPath} contentTypeOverride="image/jpeg" />
);

export const ReceiptHighres = ({ receipt }: { receipt: Receipt }) => (
  <div className="relative overflow-hidden md:h-max-(--content-max-height) md:w-full">
    <ReceiptImg receipt={receipt} pathGetter={getHighresPath} />
    <div className="top-6 right-6 shadow-lg outline-none rounded-full -mb-[2em] absolute">
      <button className="btn btn-circle btn-primary" type="button" onClick={() => rotate(receipt.id)} tabIndex={-1}>
        <RotateCwSquare />
      </button>
    </div>
  </div>
);
