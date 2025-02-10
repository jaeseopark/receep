import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { Plus } from "lucide-preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { useNavigate } from "react-router-dom";

import { Transaction } from "@/types";

import { axios } from "@/api";
import { sigTransactions, upsertTransactions } from "@/store";

const columnHelper = createColumnHelper<Transaction>();

const columns = [
  columnHelper.accessor("time", {
    header: () => "Time",
    cell: (info) => {
      // TODO: abs time on hover?
      return <span>{formatDistanceToNow(new Date(info.getValue()), { addSuffix: true })}</span>;
    },
    footer: (info) => info.column.id,
  }),
  columnHelper.accessor("notes", {
    cell: (info) => <i>{info.getValue()}</i>,
    header: () => <span>Notes</span>,
    footer: (info) => info.column.id,
  }),
  columnHelper.accessor("vendor", {
    cell: (info) => <i>{info.getValue()}</i>,
    header: () => <span>Vendor</span>,
    footer: (info) => info.column.id,
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
    footer: (info) => info.column.id,
  }),
];

const TransactionsTable = () => {
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 50,
  });
  const navigate = useNavigate();
  const data = useMemo(() => sigTransactions.value.filter((t) => t.id > 0), [sigTransactions.value]);

  const getTransactions = useCallback(() => {
    axios
      .get("/api/transactions/paginated", {
        params: { ...pagination },
      })
      .then((r) => r.data)
      .then(({ next_offset, items }: { next_offset: number; items: Transaction[] }) => {
        setPagination((prev) => ({
          ...prev,
          offset: next_offset,
        }));
        upsertTransactions(items);
      });
  }, [pagination]);

  useEffect(getTransactions, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

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
            <tr key={row.id}>
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
    <div className="transactions-view overflow-x-auto">
      <div className="drawer-content">{renderTable()}</div>
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
