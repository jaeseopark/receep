import { RefreshCw } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import PivotTableUI from "react-pivottable/PivotTableUI";

import { axios } from "@/api";
import { sigCategories, sigVendors } from "@/store";
import { getYearTimestamps } from "@/utils/dates";

import "react-pivottable/pivottable.css";

const TZ_OFFSET = -new Date().getTimezoneOffset() / 60;

const DEFAULT_TABLE_PROPS = {
  cols: ["month"],
  rows: ["category"],
  vals: ["amount"],
};

type ExpenseLineItem = {
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
  items: ExpenseLineItem[];
  next_offset: number;
};

const fetchReportData = async (start: number, end: number): Promise<ExpenseLineItem[]> => {
  const fetchNext = (offset: number): Promise<PaginatedReportResponse> =>
    axios
      .get("/api/reports/expenses-by-category/paginated", {
        params: {
          start: start / 1000,
          end: end / 1000,
          offset,
          tz: TZ_OFFSET, // The API returns Y/M/D in UTC by default. Providing this query param adjusts the values to the local timezone.
        },
      })
      .then((r) => r.data);

  const allItems: ExpenseLineItem[] = [];
  let offset = 0;

  do {
    // keep fetching the next page until there is none.
    const { items, next_offset } = await fetchNext(offset);
    allItems.push(...items);
    offset = items.length > 0 ? next_offset : 0;
  } while (offset > 0);

  return allItems;
};

const DateRangePicker = ({ onSubmit }: { onSubmit: (start: number, end: number) => void }) => {
  const lastFiveYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <ul className="list bg-base-100 rounded-box shadow-md m-4">
      <li className="p-4 pb-2 text-lg opacity-60 tracking-wide">Pick a year:</li>
      {lastFiveYears.map((year) => (
        <li className="list-row" key={year}>
          <span
            className="hover:underline"
            onClick={() => {
              const { start, end } = getYearTimestamps(year);
              onSubmit(start, end);
            }}
          >
            {year}
          </span>
        </li>
      ))}
    </ul>
  );
};

const ExpensesByCategory = () => {
  const [tableProps, setTableProps] = useState(DEFAULT_TABLE_PROPS);
  const [lineItems, setLineItems] = useState<ExpenseLineItem[]>();

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

  if (!lineItems) {
    return <DateRangePicker onSubmit={(start, end) => fetchReportData(start, end).then(setLineItems)} />;
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

  const rows = lineItems.map((lineItem) => ({
    category: categoryNameLookup[lineItem.category_id],
    vendor: vendorNameLookup[lineItem.vendor_id],
    ...lineItem,
  }));

  return (
    <div className="m-4">
      <div>
        <span className="text-lg">Expenses by category</span>
        <button className="btn scale-50" onClick={() => setLineItems(undefined)}>
          <RefreshCw />
        </button>
      </div>
      <PivotTableUI data={rows} onChange={setTableProps} {...tableProps} />
    </div>
  );
};

export default ExpensesByCategory;
