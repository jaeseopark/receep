import { ColumnDef } from "@tanstack/react-table";

import { Vendor } from "@/types";
import DataTable from "@/components/common/DataTable";

type VendorPickerProps = {
  vendors: Vendor[];
  onSelect: (vendor: Vendor) => void;
};

const VendorPicker = ({ vendors, onSelect }: VendorPickerProps) => {
  const columns: ColumnDef<Vendor>[] = [
    {
      accessorKey: "name",
      header: "Vendor Name",
      cell: ({ getValue }) => {
        const name = getValue<string>();
        return (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              const vendor = vendors.find((v) => v.name === name);
              if (vendor) onSelect(vendor);
            }}
            className="text-blue-500 cursor-pointer hover:underline"
          >
            {name}
          </a>
        );
      },
    },
    {
      accessorKey: "id",
      header: "ID",
    },
  ];

  return (
    <div className="h-full w-full flex flex-col p-4">
      <h2 className="text-lg font-semibold mb-4">Select a vendor:</h2>
      <div className="flex-1 min-h-0">
        <DataTable
          data={vendors}
          columns={columns}
          filterableColumns={["name"]}
          defaultSortColumn="name"
          striped={true}
        />
      </div>
    </div>
  );
};

export default VendorPicker;
