import axios from "axios";
import { useEffect, useState } from "preact/hooks";
import { toast } from "react-hot-toast";
import { useParams, useSearchParams } from "react-router-dom";

import { Transaction } from "@/types";

import TransactionForm from "@/components/transactions/TransactionForm";
import { sigInitialLoadResult } from "@/gvars";
import { sigUserInfo, upsertTransactions } from "@/store";
import { isPositiveInteger } from "@/utils/primitive";

const TransactionEditView = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [transaction, setTransaction] = useState<Transaction>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const init = () => {
      if (sigInitialLoadResult.value === "PENDING") {
        setTimeout(init, 100);
        return;
      }

      if (sigInitialLoadResult.value === "FAILED") {
        setError("Initial load failed");
        return;
      }

      if (!id) {
        const t: Transaction = {
          id: -1,
          created_at: Date.now() / 1000,
          user_id: sigUserInfo.value?.user_id as number,
          // @ts-ignore
          line_items: [{}],
        };

        const receiptId = params.get("receipt_id");
        if (receiptId) {
          t.receipt_id = Number.parseInt(receiptId);
        }

        setTransaction(t);
        return;
      }

      if (!isPositiveInteger(id)) {
        toast.error(`The transaction id is not a valid integer. id='${id}'`);
        return;
      }

      axios
        .get(`/api/transactions/single/${id}`)
        .then((r) => r.data)
        .then((t) => {
          upsertTransactions([t]);
          setTransaction({ ...t });
        })
        .catch((e) => {
          // TODO better error handling
          toast.error("The requested transaction does not exist");
        });
    };

    setTimeout(init, 100);
  }, []);

  if (error) {
    return <div>{error}</div>;
  }

  if (!transaction) {
    return <div>Loading data...</div>;
  }

  const title = transaction.id === -1 ? "New Transaction" : "Edit Transaction";

  return (
    <div className="space-y-4 p-4 md:h-(--content-max-height)">
      <h2 className="text-xl font-bold justify-center">{title}</h2>
      <TransactionForm transaction={transaction} />
    </div>
  );
};

export default TransactionEditView;
