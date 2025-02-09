import { useEffect, useState } from "preact/hooks";

const TransactionsTable = () => {
  const [transactions, setTransactions] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/transactions");
        if (!response.ok) {
          throw new Error("Failed to fetch transactions");
        }
        const data = await response.json();
        setTransactions(data);
        setIsReady(true);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchTransactions();
  }, []);

  return (
    <div className="overflow-x-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Transactions</h2>
      {!isReady && <p className="text-gray-600">Loading transactions...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {isReady && !error && (
        <table className="table w-full border rounded-lg">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3">ID</th>
              <th className="p-3">Time</th>
              <th className="p-3">Notes</th>
              <th className="p-3">User ID</th>
              <th className="p-3">Receipt ID</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{transaction.id}</td>
                <td className="p-3">{new Date(transaction.time * 1000).toLocaleString()}</td>
                <td className="p-3">{transaction.notes || "N/A"}</td>
                <td className="p-3">{transaction.user_id}</td>
                <td className="p-3">{transaction.receipt_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default TransactionsTable;
