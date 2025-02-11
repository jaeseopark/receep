import { Receipt } from "@/types";

const getThumbnailPath = (receiptId: number) => `/${receiptId}-thumb.dr`;
const getHighresPath = (receiptId: number) => `/${receiptId}.dr`;

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
    return (
      <img
        className="w-full h-auto lg:w-[50%] md:h-(--content-max-height)"
        style={{ transform: `rotate(${rotation}deg)` }}
        src={getPath(id)}
        alt={id}
      />
    );
  }

  return <div>PDF currently not supported</div>;
};

export const ReceiptThumbnail = ({ receipt }: { receipt: Receipt }) => (
  <ReceiptImg receipt={receipt} pathGetter={getThumbnailPath} contentTypeOverride="image/jpeg" />
);

export const ReceiptHighres = ({ receipt }: { receipt: Receipt }) => (
  <ReceiptImg receipt={receipt} pathGetter={getHighresPath} />
);
