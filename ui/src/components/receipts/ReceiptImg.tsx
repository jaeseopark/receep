import axios from "axios";
import { RotateCwSquare } from "lucide-preact";
import { useCallback, useEffect, useState } from "preact/hooks";
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
    return <img className="w-full h-auto" style={{ transform: `rotate(${rotation}deg)` }} src={getPath(id)} alt={id} tabIndex={-1} />;
  }

  if (contentType === "application/pdf") {
    return (
      <div className="pdf-container overflow-y-auto h-full" tabIndex={-1}>
        <Document file={getPath(id)} onLoadSuccess={onDocumentLoadSuccess}>
          {Array.from({ length: numPages || 0 }, (_, index) => (
            <Page key={index} renderTextLayer={false} pageNumber={index + 1} canvasProps={{ tabIndex: -1 }} />
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

export const ReceiptHighres = ({ receipt: receiptProp, id }: { receipt?: Receipt; id?: number }) => {
  const [receipt, setReceipt] = useState<Receipt | undefined>(
    receiptProp ?? sigReceipts.value.find((r) => r.id === id)
  );

  useEffect(() => {
    if (receipt || !id) return;
    axios
      .get(`/api/receipts/single/${id}`)
      .then((r) => r.data)
      .then((fetched: Receipt) => {
        upsertReceipts({ items: [fetched] });
        setReceipt(fetched);
      });
  }, [id]);

  if (!receipt) {
    return <div>Loading receipt...</div>;
  }

  const { content_type } = receipt;
  return (
    <div className="relative overflow-x-hidden md:h-max-(--content-max-height) md:w-half md:max-w-50vw border-2 border-base-content rounded-lg">
      <ReceiptImg receipt={receipt} pathGetter={getHighresPath} />
      {content_type.startsWith("image/") && (
        <div className="top-6 right-6 shadow-lg outline-none rounded-full -mb-[2em] absolute">
          <button className="btn btn-circle btn-primary" type="button" onClick={() => rotate(receipt.id)} tabIndex={-1}>
            <RotateCwSquare />
          </button>
        </div>
      )}
    </div>
  );
};
