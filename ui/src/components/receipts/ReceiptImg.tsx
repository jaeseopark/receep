import axios from "axios";
import { RotateCwSquare } from "lucide-preact";
import { useCallback, useState } from "preact/hooks";
import { Document, Page, pdfjs } from "react-pdf";

import { Receipt } from "@/types";

import { sigReceipts, upsertReceipts } from "@/store";

import "@/components/receipts/ReceiptImg.scss";
import { getHighresPath, getThumbnailPath } from "@/utils/receipts";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

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
  const [numPages, setNumPages] = useState<number>(); // Track the total number of pages
  const contentType = contentTypeOverride || content_type;

  const onDocumentLoadSuccess = useCallback(({ numPages: loadedNumPages }: { numPages: number }) => {
    setNumPages(loadedNumPages); // Set the total number of pages
  }, []);

  if (contentType.startsWith("image/")) {
    return <img className="w-full h-auto" style={{ transform: `rotate(${rotation}deg)` }} src={getPath(id)} alt={id} />;
  }

  if (contentType === "application/pdf") {
    return (
      <div className="pdf-container overflow-y-auto h-full">
        <Document file={getPath(id)} onLoadSuccess={onDocumentLoadSuccess}>
          {Array.from({ length: numPages || 0 }, (_, index) => (
            <Page key={index} renderTextLayer={false} pageNumber={index + 1} />
          ))}
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
    <div className="relative overflow-x-hidden md:h-max-(--content-max-height) md:w-half md:max-w-50vw border-2 border-base-content rounded-lg">
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
