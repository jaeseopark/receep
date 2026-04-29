import { createColumnHelper } from "@tanstack/react-table";

import { Category } from "@/types";

import AssetListView from "@/components/common/AssetListView";

type CategoryListViewProps = {
  categories: Category[];
  onAdd: () => void;
};

const columnHelper = createColumnHelper<Category>();

const columns = [
  columnHelper.accessor("name", {
    header: "Name",
  }),
  columnHelper.accessor("description", {
    header: "Description",
    enableSorting: false,
  }),
  columnHelper.accessor("with_autotax", {
    header: "Auto-Tax",
    cell: (info) => <input type="checkbox" className="checkbox checkbox-sm" checked={info.getValue()} disabled aria-label="Auto-tax enabled" />,
    enableSorting: false,
  }),
];

const CategoryListView = ({ categories, onAdd }: CategoryListViewProps) => {
  return <AssetListView data={categories} columns={columns} onAdd={onAdd} />;
};

export default CategoryListView;
