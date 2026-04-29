import { ColumnDef, SortingState, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { Plus } from "lucide-preact";
import { useState } from "preact/hooks";

type AssetListViewProps<T extends object> = {
  data: T[];
  columns: ColumnDef<T, any>[];
  onAdd: () => void;
};

const AssetListView = <T extends object>({ data, columns, onAdd }: AssetListViewProps<T>) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);

  const table = useReactTable<T>({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto h-full">
      <table className="table">
        <thead className="sticky top-0 bg-base-100 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="cursor-pointer" onClick={header.column.getToggleSortingHandler()}>
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
      <div className="bottom-24 fixed right-6 shadow-lg rounded-full">
        <button className="btn btn-circle btn-primary" onClick={onAdd}>
          <Plus />
        </button>
      </div>
    </div>
  );
};

export default AssetListView;
