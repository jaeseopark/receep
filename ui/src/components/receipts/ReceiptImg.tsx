import axios from "axios";
import { RotateCwSquare } from "lucide-preact";
import { Document, Page, pdfjs } from "react-pdf";

import { Receipt } from "@/types";

import { sigReceipts, upsertReceipts } from "@/store";

import "./ReceiptImg.scss";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

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
  const contentType = contentTypeOverride || content_type;
  if (contentType.startsWith("image/")) {
    return <img className="w-full h-auto" style={{ transform: `rotate(${rotation}deg)` }} src={getPath(id)} alt={id} />;
  }

  if (contentType === "application/pdf") {
    return (
      <div className="pdf-container">
        <Document file={getPath(id)}>
          <Page pageNumber={1} />
        </Document>
      </div>
    );
  }

  return <div>'{contentType}' is not supported</div>;
};

export const ReceiptThumbnail = ({ receipt }: { receipt: Receipt }) => (
  <ReceiptImg receipt={receipt} pathGetter={getThumbnailPath} contentTypeOverride="image/jpeg" />
);

export const ReceiptHighres = ({ receipt, id }: { receipt?: Receipt; id?: number }) => {
  if (!receipt) {
    const match = sigReceipts.value.find((r) => r.id === id);
    if (!match) {
      // TODO handle error
    }
    receipt = match as Receipt;
  } else {
    id = receipt.id;
  }

  const { content_type } = receipt;
  return (
    <div className="relative overflow-hidden md:h-max-(--content-max-height) md:w-full">
      <ReceiptImg receipt={receipt} pathGetter={getHighresPath} />
      {content_type.startsWith("image/") && (
        <div className="top-6 right-6 shadow-lg outline-none rounded-full -mb-[2em] absolute">
          <button className="btn btn-circle btn-primary" type="button" onClick={() => rotate(id)} tabIndex={-1}>
            <RotateCwSquare />
          </button>
        </div>
      )}
    </div>
  );
};
