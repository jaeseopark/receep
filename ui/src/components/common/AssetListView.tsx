import { ColumnDef, ColumnFiltersState, Header, SortingState, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { Plus } from "lucide-preact";
import { useState } from "preact/hooks";

type AssetListViewProps<T extends object> = {
  data: T[];
  columns: ColumnDef<T, any>[];
  onAdd: () => void;
  onClick?: (row: T) => void;
  filterableColumns?: (keyof T)[];
  defaultSortColumn?: keyof T;
  strongHeaderStyle?: boolean;
  alternateBackgroundColor?: boolean;
};

const AssetListView = <T extends object>({ data, columns, onAdd, onClick, filterableColumns, defaultSortColumn, strongHeaderStyle, alternateBackgroundColor }: AssetListViewProps<T>) => {
  const [sorting, setSorting] = useState<SortingState>(defaultSortColumn ? [{ id: defaultSortColumn as string, desc: false }] : []);
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
      <table className="table">
        <thead className={`sticky top-0 z-10 ${strongHeaderStyle ? "bg-base-300 text-base-content uppercase text-xs tracking-wider border-b border-base-content/20" : "bg-base-100"}`}>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header: Header<T, unknown>) => {
                const toggleSort = header.column.getToggleSortingHandler();
                return (
                  <th
                    key={header.id}
                    className="cursor-pointer"
                    onClick={toggleSort}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleSort?.(e as unknown as MouseEvent);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" ? " 🔼" : ""}
                      {header.column.getIsSorted() === "desc" ? " 🔽" : ""}
                    </div>
                    {filterableColumns?.includes(header.id as keyof T) && (
                      <input
                        type="text"
                        className="input input-bordered input-xs w-full mt-1 font-normal normal-case tracking-normal"
                        placeholder="Filter..."
                        value={(header.column.getFilterValue() as string) ?? ""}
                        onInput={(e) => header.column.setFilterValue((e.target as HTMLInputElement).value || undefined)}
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
          {table.getRowModel().rows.map((row, i) => (
            <tr key={row.id} className={`${alternateBackgroundColor ? (i % 2 === 0 ? "bg-base-100" : "bg-base-200") : ""} ${onClick ? "cursor-pointer hover:brightness-95" : ""}`} onClick={() => onClick?.(row.original)}>
              {row.getVisibleCells().map((cell) => {
                const value = cell.getValue();
                const isCheckbox = typeof value === "boolean";
                return (
                  <td key={cell.id} className={isCheckbox ? "cursor-default" : "cursor-pointer"}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="bottom-24 fixed right-6 shadow-lg rounded-full">
        <button className="btn btn-circle btn-primary" onClick={onAdd}>
          <Plus />
        </button>
      </div>
    </div>
  );
};

export default AssetListView;
