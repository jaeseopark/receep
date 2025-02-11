import { useEffect, useState } from "preact/hooks";
import { toast } from "react-hot-toast";
import { useParams, useSearchParams } from "react-router-dom";

import { Transaction } from "@/types";

import { sigTransactions, sigUserInfo } from "@/store";
import { isPositiveInteger } from "@/utils/primitive";

import TransactionForm from "./TransactionForm";

const TransactionEditView = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [transaction, setTransaction] = useState<Transaction>();

  useEffect(() => {
    const init = () => {
      if (!sigUserInfo.value) {
        setTimeout(init, 100);
        return;
      }

      if (!id) {
        const t: Transaction = {
          id: -1,
          created_at: Date.now() / 1000,
          user_id: sigUserInfo.value?.user_id,
          line_items: [],
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

      const [t] = sigTransactions.value.filter((t) => t.id === Number.parseInt(id));
      if (t) {
        setTransaction({ ...t });
        return;
      }

      toast.error("The requested transaction does not exist");
    };

    setTimeout(init, 100);
  }, []);

  if (!transaction) {
    return <div>Loading data...</div>;
  }

  return <TransactionForm transaction={transaction} />;
};

export default TransactionEditView;
