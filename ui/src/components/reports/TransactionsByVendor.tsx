import { RefreshCw } from "lucide-preact";
import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { useNavigate, useParams } from "react-router-dom";
import PivotTableUI from "react-pivottable/PivotTableUI";

import { axios } from "@/api";
import { ROUTE_PATHS } from "@/const";
import { sigCategories, sigVendors } from "@/store";
import { Vendor } from "@/types";
import { TZ_OFFSET_HRS } from "@/utils/dates";
import { getVendorReportPath } from "@/utils/paths";

import "react-pivottable/pivottable.css";

type PivotTableProps = { cols: string[]; rows: string[]; vals: string[] };

type VendorLineItem = {
  category_id: number;
  vendor_id: number;
  tx_id: number;
  year: number;
  month: number;
  day: number;
  day_of_week: string;
  amount: number;
};

type PaginatedReportResponse = {
  items: VendorLineItem[];
  next_offset: number;
};

const REPORT_PRESETS: { [key: string]: { props: PivotTableProps } } = {
  Default: {
    props: {
      cols: ["category"],
      rows: ["year", "tx_id"],
      vals: ["amount"],
    },
  },
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

const TransactionsByVendor = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const vendors = sigVendors.value;

  const [tableProps, setTableProps] = useState(REPORT_PRESETS.Default.props);
  const [lineItems, setLineItems] = useState<VendorLineItem[]>();
  const [resolvedVendor, setResolvedVendor] = useState<Vendor>();

  const linkifyTransactions = useCallback((props: PivotTableProps) => {
    const txIdRows = props.rows
      .map((col, i) => ({ col, i }))
      .find(({ col }) => col === "tx_id");

    if (!txIdRows) return;

    setTimeout(
      () =>
        document.querySelectorAll("table.pvtTable tbody tr").forEach((row) => {
          const thElements = row.querySelectorAll("th");
          const txIdTh = thElements[thElements.length - (props.rows.length - txIdRows.i)];
          const text = txIdTh.textContent?.trim();
          if (text) {
            const container = document.createElement("span");
            txIdTh.textContent = "";
            txIdTh.appendChild(container);
            render(
              <a
                href={`/transactions/edit/${text}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 cursor-pointer hover:underline"
              >
                {text}
              </a>,
              container,
            );
          }
        }),
      100,
    );
  }, []);

  const loadVendor = useCallback(
    (vendor: Vendor) => {
      setResolvedVendor(vendor);
      setLineItems(undefined);
      fetchLineItems(vendor.id).then(setLineItems);
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
  }, [vendorId, vendors.length]);

  useEffect(() => {
    setTimeout(
      () =>
        setTableProps((prev) => ({
          ...prev,
          aggregatorName: "Sum",
        })),
      100,
    );
  }, [lineItems]);

  useEffect(() => linkifyTransactions(tableProps), [tableProps, linkifyTransactions]);

  if (!resolvedVendor && !vendorId) {
    return <VendorPicker vendors={vendors} onSelect={loadVendor} />;
  }

  if (!lineItems) {
    return <div className="m-4 text-sm opacity-60">Loading...</div>;
  }

  const categoryNameLookup = sigCategories.value.reduce(
    (acc, { id, name }) => {
      acc[id] = name;
      return acc;
    },
    {} as Record<number, string>,
  );

  const rows = lineItems.map((lineItem) => ({
    category: categoryNameLookup[lineItem.category_id],
    ...lineItem,
  }));

  return (
    <div className="m-4">
      <div>
        <span className="text-lg">
          {resolvedVendor ? `Vendor Report — ${resolvedVendor.name}` : "Vendor Report"}
        </span>
        <button
          className="btn scale-50"
          onClick={() => {
            setLineItems(undefined);
            setResolvedVendor(undefined);
            navigate(ROUTE_PATHS.VENDOR_REPORT, { replace: true });
          }}
        >
          <RefreshCw />
        </button>
      </div>
      {Object.entries(REPORT_PRESETS).map(([name, { props }]) => (
        <button
          className="btn rounded-lg"
          key={name}
          onClick={() => setTableProps((prev) => ({ ...prev, ...props }))}
        >
          {name}
        </button>
      ))}
      <PivotTableUI
        {...tableProps}
        data={rows}
        onChange={(newProps: PivotTableProps) => {
          setTableProps(newProps);
          linkifyTransactions(newProps);
        }}
      />
    </div>
  );
};

export default TransactionsByVendor;

