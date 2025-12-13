import axios from "axios";
import { useEffect, useState } from "preact/hooks";
import { toast } from "react-hot-toast";
import { useSearchParams } from "react-router-dom";

import { Transaction } from "@/types";

import TransactionsTable from "@/components/transactions/Transactions";
import { sigInitialLoadResult } from "@/gvars";
import { upsertTransactions } from "@/store";

const TransactionDrilldownView = () => {
  const [params] = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const init = () => {
      if (sigInitialLoadResult.value === "PENDING") {
        setTimeout(init, 100);
        return;
      }

      if (sigInitialLoadResult.value === "FAILED") {
        setError("Initial load failed");
        setLoading(false);
        return;
      }

      const vendorId = params.get("vendor_id");
      const categoryId = params.get("category_id");

      if (!vendorId && !categoryId) {
        setError("Either vendor_id or category_id must be provided");
        setLoading(false);
        return;
      }

      if (vendorId && categoryId) {
        setError("Only one of vendor_id or category_id can be specified");
        setLoading(false);
        return;
      }

      let apiParams: any = {
        offset: 0,
        limit: 1000, // Load all transactions
      };

      if (vendorId) {
        // Fetch transactions by vendor_id
        apiParams.vendor_id = vendorId;
      } else if (categoryId) {
        // TODO: Implement category filtering
        apiParams.category_id = categoryId;
      }

      // Fetch transactions
      axios
        .get("/api/transactions/paginated", { params: apiParams })
        .then((r) => r.data)
        .then(({ items }: { items: Transaction[] }) => {
          // Upsert transactions to global state
          upsertTransactions({ items });
          setTransactions(items);
          setLoading(false);
        })
        .catch((e) => {
          console.error("Failed to fetch transactions:", e);
          toast.error("Failed to fetch transactions");
          setError("Failed to fetch transactions");
          setLoading(false);
        });
    };

    setTimeout(init, 100);
  }, [params]);

  if (loading) {
    return <div className="p-4">Loading transactions...</div>;
  }

  if (error) {
    return <div className="p-4 text-error">{error}</div>;
  }

  if (transactions.length === 0) {
    return <div className="p-4">No transactions found for the specified criteria.</div>;
  }

  return (
    <div className="h-full">
      <div className="p-4">
        <h2 className="text-xl font-bold">Transaction Drilldown</h2>
        <p className="text-sm text-gray-600">Showing {transactions.length} transaction(s)</p>
      </div>
      <TransactionsTable data={transactions} isExhausted />
    </div>
  );
};

export default TransactionDrilldownView;
