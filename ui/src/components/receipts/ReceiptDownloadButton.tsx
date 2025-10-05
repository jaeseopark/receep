import { getHighresPath } from "@/utils/receipts";

const ReceiptDownloadButton = ({ receiptId }: { receiptId: number }) => {
  const handleDownload = () => {
    window.location.href = getHighresPath(receiptId);
  };

  return (
    <button className="btn btn-primary" type="button" onClick={handleDownload} title="Download">
      Download
    </button>
  );
};

export default ReceiptDownloadButton;
