import { ColumnDef } from "@tanstack/react-table";
import { RefreshCw } from "lucide-preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { useNavigate, useParams } from "react-router-dom";

import { axios } from "@/api";
import { ROUTE_PATHS } from "@/const";
import { sigCategories, sigVendors } from "@/store";
import { Vendor } from "@/types";
import { TZ_OFFSET_HRS } from "@/utils/dates";
import { getVendorReportPath } from "@/utils/paths";
import DataTable from "@/components/common/DataTable";

type VendorLineItem = {
  category_id: number;
  vendor_id: number;
  tx_id: number;
  year: number;
  month: number;
  day: number;
  day_of_week: string;
  amount: number;
  category?: string;
};

type PaginatedReportResponse = {
  items: VendorLineItem[];
  next_offset: number;
};

const fetchLineItems = async (vendorId: number): Promise<VendorLineItem[]> => {
  const fetchNext = (offset: number): Promise<PaginatedReportResponse> =>
    axios
      .get("/api/reports/line-items-by-vendor/paginated", {
        params: { vendor_id: vendorId, offset, tz: TZ_OFFSET_HRS },
      })
      .then((r) => r.data);

  const allItems: VendorLineItem[] = [];
  let offset = 0;

  do {
    const { items, next_offset } = await fetchNext(offset);
    allItems.push(...items);
    offset = items.length > 0 ? next_offset : 0;
  } while (offset > 0);

  return allItems;
};

const VendorPicker = ({ vendors, onSelect }: { vendors: Vendor[]; onSelect: (v: Vendor) => void }) => (
  <ul className="list bg-base-100 rounded-box shadow-md m-4">
    <li className="p-4 pb-2 text-lg opacity-60 tracking-wide">Select a vendor:</li>
    {vendors.map((vendor) => (
      <li className="list-row" key={vendor.id}>
        <span className="hover:underline cursor-pointer" onClick={() => onSelect(vendor)}>
          {vendor.name}
        </span>
      </li>
    ))}
  </ul>
);

const getColumns = (): ColumnDef<VendorLineItem>[] => [
  {
    accessorKey: "category",
    header: "Category",
  },
  {
    accessorKey: "year",
    header: "Year",
  },
  {
    accessorKey: "month",
    header: "Month",
  },
  {
    accessorKey: "day",
    header: "Day",
  },
  {
    accessorKey: "day_of_week",
    header: "Day of Week",
  },
  {
    accessorKey: "tx_id",
    header: "Transaction ID",
    cell: ({ getValue }) => {
      const txId = getValue<number>();
      return (
        <a
          href={`/transactions/edit/${txId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 cursor-pointer hover:underline"
        >
          {txId}
        </a>
      );
    },
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ getValue }) => {
      const amount = getValue<number>();
      return `$${amount.toFixed(2)}`;
    },
  },
];

const TransactionsByVendor = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const vendors = sigVendors.value;

  const [lineItems, setLineItems] = useState<VendorLineItem[]>([]);
  const [resolvedVendor, setResolvedVendor] = useState<Vendor>();

  const loadVendor = useCallback(
    (vendor: Vendor) => {
      setResolvedVendor(vendor);
      setLineItems([]);
      fetchLineItems(vendor.id).then((items) => {
        // Enrich line items with category names
        const categoryNameLookup = sigCategories.value.reduce(
          (acc, { id, name }) => {
            acc[id] = name;
            return acc;
          },
          {} as Record<number, string>,
        );

        const enrichedItems = items.map((item) => ({
          ...item,
          category: categoryNameLookup[item.category_id],
        }));
        setLineItems(enrichedItems);
      });
      if (!vendorId) {
        navigate(getVendorReportPath(vendor.id), { replace: true });
      }
    },
    [vendorId, navigate],
  );

  useEffect(() => {
    if (vendorId) {
      const vendor = vendors.find((v) => v.id === Number(vendorId));
      if (vendor) loadVendor(vendor);
    }
  }, [vendorId, vendors.length, loadVendor]);

  if (!resolvedVendor && !vendorId) {
    return <VendorPicker vendors={vendors} onSelect={loadVendor} />;
  }

  const columns = getColumns();

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-4 flex items-center gap-4 border-b">
        <span className="text-lg font-semibold">
          {resolvedVendor ? `Vendor Report — ${resolvedVendor.name}` : "Vendor Report"}
        </span>
        <button
          className="btn btn-sm scale-75"
          onClick={() => {
            setLineItems([]);
            setResolvedVendor(undefined);
            navigate(ROUTE_PATHS.VENDOR_REPORT, { replace: true });
          }}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="flex-1 w-full min-h-0">
        {lineItems.length > 0 ? (
          <DataTable
            data={lineItems}
            columns={columns}
            filterableColumns={["category", "day_of_week"]}
            defaultSortColumn="year"
            striped={true}
          />
        ) : (
          <div className="m-4 text-sm opacity-60">
            {resolvedVendor ? "Loading..." : ""}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsByVendor;

