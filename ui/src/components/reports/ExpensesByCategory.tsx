import { startOfYear } from "date-fns";
import { RefreshCw } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import PivotTableUI from "react-pivottable/PivotTableUI";

import { ExpenseLineItem } from "@/types";

import { axios } from "@/api";
import { sigExpensesByCategory } from "@/gvars";
import { sigCategories, sigVendors } from "@/store";

import "react-pivottable/pivottable.css";

const DEFAULT_TABLE_PROPS = {
  cols: ["month"],
  rows: ["category"],
  vals: ["amount"],
};

type ReportResponse = {
  items: ExpenseLineItem[];
  next_offset: number;
};

const DateRangePicker = ({ onSubmit }: { onSubmit: (start: number, end: number) => void }) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

  return (
    <ul className="list bg-base-100 rounded-box shadow-md m-4">
      <li className="p-4 pb-2 text-lg opacity-60 tracking-wide">Pick a date range</li>
      <li className="list-row">
        <span className="hover:underline" onClick={() => onSubmit(startOfMonth, now.getTime())}>
          This Month
        </span>
      </li>
      <li className="list-row">
        <span className="hover:underline" onClick={() => onSubmit(startOfYear, now.getTime())}>
          This Year
        </span>
      </li>
    </ul>
  );
};

const ExpensesByCategory = () => {
  const [tableProps, setTableProps] = useState(DEFAULT_TABLE_PROPS);

  useEffect(() => {
    // Unable to set aggregatorName until 'aggregators' is populated.
    // PivotTableUI populates aggregators on load. Give it 100 ms.
    setTimeout(
      () =>
        setTableProps((prev) => ({
          ...prev,
          aggregatorName: "Sum",
        })),
      100,
    );
  }, []);

  const fetchReportData = (start: number, end: number) => {
    const fetchedItems: ExpenseLineItem[] = [];
    const fetchNext = (offset: number = 0) =>
      axios
        .get("/api/reports/expenses-by-category/paginated", {
          params: {
            start: start / 1000,
            end: end / 1000,
            offset,
          },
        })
        .then((r) => r.data)
        .then(({ items, next_offset }: ReportResponse) => {
          offset = next_offset;
          fetchedItems.push(...items);
          if (items.length > 0) {
            fetchNext(next_offset);
          } else {
            sigExpensesByCategory.value = fetchedItems;
          }
        });

    fetchNext();
  };

  if (!sigExpensesByCategory.value) {
    return <DateRangePicker onSubmit={fetchReportData} />;
  }

  const categoryNameLookup = sigCategories.value.reduce(
    (acc, { id, name }) => {
      acc[id] = name;
      return acc;
    },
    {} as Record<number, string>,
  );

  const vendorNameLookup = sigVendors.value.reduce(
    (acc, { id, name }) => {
      acc[id] = name;
      return acc;
    },
    {} as Record<number, string>,
  );

  const rows = sigExpensesByCategory.value.map((lineItem) => ({
    category: categoryNameLookup[lineItem.category_id],
    vendor: vendorNameLookup[lineItem.vendor_id],
    ...lineItem,
  }));

  return (
    <div>
      <div>
        Expenses by category
        <button
          onClick={() => {
            sigExpensesByCategory.value = undefined;
          }}
        >
          <RefreshCw />
        </button>
      </div>
      <PivotTableUI data={rows} onChange={setTableProps} {...tableProps} />
    </div>
  );
};

export default ExpensesByCategory;
