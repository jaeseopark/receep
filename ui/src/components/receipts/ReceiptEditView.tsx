import axios from "axios";
import { RotateCwSquare } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";

import { Receipt } from "@/types";

import { ReceiptHighres } from "@/components/receipts/ReceiptImg";
import { sigInitialLoadResult } from "@/gvars";
import { sigReceipts, upsertReceipts } from "@/store";
import { isPositiveInteger } from "@/utils/primitive";

const rotate = (receipt_id: number) =>
  axios
    .post(`/api/receipts/${receipt_id}/rotate`)
    .then((r) => r.data)
    .then((receipt) => upsertReceipts([receipt]));

const ReceiptEditView = () => {
  const { id } = useParams();
  const [receipt, setReceipt] = useState<Receipt>();

  useEffect(() => {
    const init = () => {
      if (sigInitialLoadResult.value === "PENDING") {
        setTimeout(init, 100);
        return;
      }

      if (!isPositiveInteger(id)) {
        toast.error(`The Receipt ID is not a valid integer. id='${id}'`);
        return;
      }

      // TODO make sure Sigreceipt value is popualted first.
      const [r] = sigReceipts.value.filter((r) => r.id === Number.parseInt(id!));
      if (!r) {
        toast.error(`The requested Receipt ID does not exist. id='${id}'`);
        return;
      }

      setReceipt(r);
    };

    setTimeout(init, 100);
  }, [sigReceipts.value]);

  if (!receipt) {
    return <div>Loading...</div>;
  }

  return (
    <div className="receipt-edit-view">
      <div className="overflow-hidden">
        <ReceiptHighres receipt={receipt} />
      </div>
      <div className="bottom-24 fixed right-6 shadow-lg rounded-full">
        <button type="submit" className="btn btn-circle btn-primary" onClick={() => rotate(receipt.id)}>
          <RotateCwSquare />
        </button>
      </div>
    </div>
  );
};

export default ReceiptEditView;
