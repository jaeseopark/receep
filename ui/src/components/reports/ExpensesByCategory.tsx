import { useState } from "preact/hooks";
import PivotTableUI from "react-pivottable/PivotTableUI";

import { ExpenseLineItem, LineItem } from "@/types";

import { axios } from "@/api";
import { sigExpensesByCategory } from "@/gvars";
import { sigCategories, sigVendors } from "@/store";

import "react-pivottable/pivottable.css";

type ReportResponse = {
  items: ExpenseLineItem[];
  next_offset: number;
};

const DateRangePicker = ({ onSubmit }: { onSubmit: (start: number, end: number) => void }) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const getStartOfYear = new Date(now.getFullYear(), 0, 1).getTime();

  return (
    <div>
      <div>Pick a date range:</div>
      <div>
        <button onClick={() => onSubmit(startOfMonth, now.getTime())}>This Month</button>
      </div>
      <div>
        <button onClick={() => onSubmit(getStartOfYear, now.getTime())}>This Year</button>
      </div>
    </div>
  );
};

const ExpensesByCategory = () => {
  const [tableProps, setTableProps] = useState({});

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
    (acc, { id, code, name }) => {
      acc[id] = `${code}-${name}`;
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
      <div>Expenses by category</div>
      <PivotTableUI data={rows} onChange={setTableProps} {...tableProps} />
    </div>
  );
};

export default ExpensesByCategory;
