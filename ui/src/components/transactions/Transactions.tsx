import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Plus } from "lucide-preact";
import { useCallback, useRef } from "preact/hooks";
import { useNavigate } from "react-router-dom";

import { Transaction } from "@/types";

import { fetchTransactions, transactionPagination } from "@/gvars";
import { sigTransactions, sigVendors } from "@/store";
import { toAbsoluteDate } from "@/utils/dates";

const columnHelper = createColumnHelper<Transaction>();

// TODO: implement sorting

const columns = [
  columnHelper.accessor("timestamp", {
    header: () => "Date",
    cell: (info) => {
      const timestamp = info.getValue();
      return <span>{toAbsoluteDate(timestamp)}</span>;
    },
  }),
  columnHelper.accessor("vendor_id", {
    header: () => <span>Vendor</span>,
    cell: (info) => {
      const vendor = sigVendors.value.find((v) => v.id === info.getValue());
      return <span>{vendor?.name}</span>;
    },
  }),
  columnHelper.accessor("amount", {
    cell: (info) => {
      const formattedPrice = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD", // TODO parameterize currency
      }).format(info.getValue());

      return <i>{formattedPrice}</i>;
    },
    header: () => <span>Amount</span>,
  }),
  columnHelper.accessor("receipt_id", {
    header: "Receipt",
    cell: (info) => {
      // receipt_id starts at 1, so no need to account for falsy evaluation.
      if (info.getValue()) {
        return (
          <div className="mask mask-squircle h-12 w-12">
            <img src={`/${info.getValue()}-thumb.dr`} className="w-full h-auto rounded-md object-cover" />
          </div>
        );
      }
    },
  }),
];

const TransactionsTable = () => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const table = useReactTable<Transaction>({
    data: sigTransactions.value,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleScroll = useCallback(() => {
    // TODO: debounce or something.. may be finicky if user scrolls too fast.

    const container = scrollContainerRef.current;
    if (!container) return;

    // Check if the user has scrolled near the bottom
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 50) {
      fetchTransactions();
    }
  }, []);

  /* ---------------------------------------
   * End of hooks
   * --------------------------------------- */

  /* ---------------------------------------
   * Start of rendering
   * --------------------------------------- */

  const renderTable = () => {
    return (
      <table className="table">
        {/* head */}
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} onClick={header.column.getToggleSortingHandler()} className="cursor-pointer">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() === "asc" ? " 🔼" : ""}
                  {header.column.getIsSorted() === "desc" ? " 🔽" : ""}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} onClick={() => navigate(`/transactions/edit/${row.original.id}`)}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div
      className="transactions-view overflow-x-auto h-full"
      ref={scrollContainerRef}
      onScroll={!transactionPagination.value.isExausted ? handleScroll : undefined}
    >
      {renderTable()}
      {transactionPagination.value.isExausted && <div className="text-center p-4">No more transactions to load.</div>}
      <div className="bottom-24 fixed right-6 shadow-lg rounded-full">
        <button
          className="btn btn-circle btn-primary"
          onClick={() => {
            navigate("/transactions/new");
          }}
        >
          <Plus />
        </button>
      </div>
    </div>
  );
};

export default TransactionsTable;
