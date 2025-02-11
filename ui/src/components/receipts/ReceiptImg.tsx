import { Receipt } from "@/types";

const getThumbnailPath = (receiptId: number) => `/${receiptId}-thumb.dr`;
const getHighresPath = (receiptId: number) => `/${receiptId}.dr`;

const ReceiptImg = ({
  receipt: { id, rotation },
  pathGetter: getPath,
}: {
  receipt: Receipt;
  pathGetter: (id: number) => string;
}) => <img className="w-full md:w-[50%] md:h-full" style={{ transform: `rotate(${rotation}deg)` }} src={getPath(id)} alt={id} />;

export const ReceiptThumbnail = ({ receipt }: { receipt: Receipt }) => (
  <ReceiptImg receipt={receipt} pathGetter={getThumbnailPath} />
);

export const ReceiptHighres = ({ receipt }: { receipt: Receipt }) => (
  <ReceiptImg receipt={receipt} pathGetter={getHighresPath} />
);
