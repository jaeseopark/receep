import TransactionsTable from "@/components/transactions/Transactions";
import { fetchTransactions, transactionPagination } from "@/gvars";
import { sigTransactions } from "@/store";

const RecentTransactionsView = () => {
  return (
    <>
      <TransactionsTable 
        data={sigTransactions.value} 
        fetchTransactions={fetchTransactions}
        isExhausted={transactionPagination.value.isExhausted}
      />
    </>
  );
};

export default RecentTransactionsView;
