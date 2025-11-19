import {
  ColumnFiltersState,
  SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import fuzzysort from "fuzzysort";
import { Plus } from "lucide-preact";
import { useCallback, useRef, useState } from "preact/hooks";
import { useNavigate } from "react-router-dom";

import { Transaction } from "@/types";

import { ROUTE_PATHS } from "@/const";
import { fetchTransactions, transactionPagination } from "@/gvars";
import { sigTransactions, sigVendors } from "@/store";
import { toAbsoluteDate } from "@/utils/dates";
import { getEditTransactionPath } from "@/utils/paths";

const columnHelper = createColumnHelper<Transaction>();

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
    enableColumnFilter: true,
    filterFn: (row, columnId, filterValue) => {
      const vendorId = row.getValue(columnId) as number;
      const vendor = sigVendors.value.find((v) => v.id === vendorId);
      const vendorName = vendor?.name || "";
      const result = fuzzysort.single(filterValue, vendorName);
      return result !== null;
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
    enableColumnFilter: true,
    filterFn: "inNumberRange",
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
  const [sorting, setSorting] = useState<SortingState>([]); // State to manage sorting
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]); // State to manage filters

  const table = useReactTable<Transaction>({
    data: sigTransactions.value,
    columns,
    state: {
      sorting, // Pass the sorting state to the table
      columnFilters, // Pass the column filters state to the table
    },
    onSortingChange: setSorting, // Update sorting state when it changes
    onColumnFiltersChange: setColumnFilters, // Update filter state when it changes
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(), // Enable sorted row model
    getFilteredRowModel: getFilteredRowModel(), // Enable filtered row model
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
        <thead className="sticky top-0 bg-base-100 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="cursor-pointer">
                  <div onClick={header.column.getToggleSortingHandler()}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === "asc" ? " 🔼" : ""}
                    {header.column.getIsSorted() === "desc" ? " 🔽" : ""}
                  </div>
                  {header.column.getCanFilter() ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={(header.column.getFilterValue() ?? "") as string}
                        onChange={(e) => header.column.setFilterValue((e.target as HTMLInputElement).value)}
                        placeholder={`Filter...`}
                        className="input input-bordered input-xs w-full mt-1"
                      />
                    </div>
                  ) : null}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} onClick={() => navigate(getEditTransactionPath(row.original.id))}>
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
        <button className="btn btn-circle btn-primary" onClick={() => navigate(ROUTE_PATHS.NEW_TRANSACTION)}>
          <Plus />
        </button>
      </div>
    </div>
  );
};

export default TransactionsTable;
