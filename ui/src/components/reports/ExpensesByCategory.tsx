import { RefreshCw } from "lucide-preact";
import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import PivotTableUI from "react-pivottable/PivotTableUI";

import { axios } from "@/api";
import { sigCategories, sigVendors } from "@/store";
import { getYearTimestamps } from "@/utils/dates";

import "react-pivottable/pivottable.css";

const TZ_OFFSET = -new Date().getTimezoneOffset() / 60;

type PivotTableProps = { cols: string[]; rows: string[]; vals: string[] };

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

const REPORT_PRESETS: {
  [key: string]: { props: PivotTableProps };
} = {
  Default: {
    props: {
      cols: ["month"],
      rows: ["category"],
      vals: ["amount"],
    },
  },
  "Verify Transactions": {
    props: { cols: ["category"], rows: ["month", "day", "tx_id", "vendor"], vals: ["amount"] },
  },
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
  const [tableProps, setTableProps] = useState(REPORT_PRESETS.Default.props);
  const [lineItems, setLineItems] = useState<ExpenseLineItem[]>();

  const linkifyTransactions = useCallback((props: PivotTableProps) => {
    const txIdRows = props.rows
      .map((col, i) => ({ col, i }))
      .find(({ col }) => {
        return col === "tx_id";
      });

    if (!txIdRows) {
      return;
    }

    setTimeout(
      () =>
        document.querySelectorAll("table.pvtTable tbody tr").forEach((row) => {
          const thElements = row.querySelectorAll("th");
          const txIdTh = thElements[thElements.length - (props.rows.length - txIdRows.i)];
          const text = txIdTh.textContent?.trim(); // Get the text content of the <th>
          if (text) {
            const container = document.createElement("span"); // Create a container element
            txIdTh.textContent = ""; // Clear the existing content
            txIdTh.appendChild(container); // Append the container to the <th>

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

  useEffect(() => linkifyTransactions(tableProps), [tableProps, linkifyTransactions]);

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
      {Object.entries(REPORT_PRESETS).map(([name, { props }]) => (
        <button
          className="btn rounded-lg"
          key={name}
          onClick={() => {
            setTableProps((prev) => ({ ...prev, ...props }));
          }}
        >
          {name}
        </button>
      ))}
      <PivotTableUI
        data={rows}
        onChange={(newProps: PivotTableProps) => {
          setTableProps(newProps);
          linkifyTransactions(newProps);
        }}
        {...tableProps}
      />
    </div>
  );
};

export default ExpensesByCategory;
