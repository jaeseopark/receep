import { Receipt, Transaction } from "@/types";
import { getDownloadFilename, getHighresPath } from "@/utils/receipts";

const ReceiptDownloadButton = ({ receipt, transaction }: { receipt: Receipt; transaction?: Transaction }) => {
  return (
    <a className="btn btn-primary" href={getHighresPath(receipt.id)} download={getDownloadFilename(receipt, transaction)}>
      Download
    </a>
  );
};

export default ReceiptDownloadButton;
