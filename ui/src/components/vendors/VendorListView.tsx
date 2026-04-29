import { createColumnHelper } from "@tanstack/react-table";

import { Vendor } from "@/types";

import AssetListView from "@/components/common/AssetListView";

type VendorListViewProps = {
  vendors: Vendor[];
  onAdd: () => void;
};

const columnHelper = createColumnHelper<Vendor>();

const columns = [
  columnHelper.accessor("name", {
    header: "Name",
  }),
];

const VendorListView = ({ vendors, onAdd }: VendorListViewProps) => {
  return <AssetListView data={vendors} columns={columns} onAdd={onAdd} />;
};

export default VendorListView;
