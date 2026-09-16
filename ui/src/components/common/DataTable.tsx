import { ColumnDef, ColumnFiltersState, Header, SortingState, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useState } from "preact/hooks";

type DataTableProps<T extends object> = {
  data: T[];
  columns: ColumnDef<T, any>[];
  filterableColumns?: (keyof T)[];
  defaultSortColumn?: keyof T;
  defaultSortDesc?: boolean;
  striped?: boolean;
  compact?: boolean;
};

const DataTable = <T extends object>({
  data,
  columns,
  filterableColumns,
  defaultSortColumn,
  defaultSortDesc = false,
  striped = true,
  compact = false,
}: DataTableProps<T>) => {
  const [sorting, setSorting] = useState<SortingState>(
    defaultSortColumn ? [{ id: String(defaultSortColumn), desc: defaultSortDesc }] : []
  );
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable<T>({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto h-full">
      <table className={`table ${compact ? "table-compact" : ""}`}>
        <thead className="sticky top-0 z-10 bg-base-300 text-base-content uppercase text-xs tracking-wider border-b border-base-content/20">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header: Header<T, unknown>) => {
                const toggleSort = header.column.getToggleSortingHandler();
                return (
                  <th
                    key={header.id}
                    className="cursor-pointer hover:bg-base-400"
                    onClick={toggleSort}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleSort?.(e);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-2">
                      <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                      <span className="text-xs">
                        {header.column.getIsSorted() === "asc" ? "🔼" : ""}
                        {header.column.getIsSorted() === "desc" ? "🔽" : ""}
                      </span>
                    </div>
                    {filterableColumns?.some((col) => col === header.id) && (
                      <input
                        type="text"
                        className="input input-bordered input-xs w-full mt-1 font-normal normal-case tracking-normal"
                        placeholder="Filter..."
                        value={String(header.column.getFilterValue() ?? "")}
                        onInput={(e) => header.column.setFilterValue(e.currentTarget.value || undefined)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-sm opacity-60">
                No data available
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                className={`${striped ? (i % 2 === 0 ? "bg-base-100" : "bg-base-200") : ""}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
