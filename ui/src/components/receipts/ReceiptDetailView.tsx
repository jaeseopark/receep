import axios from "axios";
import { Link, Plus, RotateCwSquare } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

import { Receipt } from "@/types";

import ReceiptDetailForm from "@/components/receipts/ReceiptForm";
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
  const navigate = useNavigate();

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

  // TODO: make the image maintain its aspect ratio
  return (
    <div className="receipt-edit-view">
      <div className="overflow-hidden object-cover lg:flex">
        <ReceiptHighres receipt={receipt} />
        <ReceiptDetailForm receipt={receipt} />
      </div>
      <div className="bottom-24 fixed right-6 shadow-lg rounded-full">
        <button className="btn btn-circle btn-primary" onClick={() => rotate(receipt.id)}>
          <RotateCwSquare />
        </button>
      </div>
      {receipt.transactions.length === 0 && (
        <>
          <div className="bottom-24 fixed right-20 shadow-lg rounded-full">
            <button
              className="btn btn-circle btn-primary"
              onClick={() => navigate(`/transactions/new?receipt_id=${receipt.id}`)}
            >
              <Plus />
            </button>
          </div>
          <div className="bottom-24 fixed right-34 shadow-lg rounded-full">
            <button
              className="btn btn-circle btn-primary"
              onClick={() => navigate(`/transactions/new?receipt_id=${receipt.id}`)}
            >
              <Link className="scale-85" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ReceiptEditView;
