import { RefreshCw } from "lucide-preact";
import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { useNavigate, useParams } from "react-router-dom";
import PivotTableUI from "react-pivottable/PivotTableUI";

import { axios } from "@/api";
import { ROUTE_PATHS } from "@/const";
import { sigCategories, sigVendors } from "@/store";
import { Category } from "@/types";
import { TZ_OFFSET_HRS } from "@/utils/dates";
import { getCategoryReportPath } from "@/utils/paths";

import "react-pivottable/pivottable.css";

type PivotTableProps = { cols: string[]; rows: string[]; vals: string[] };

type CategoryLineItem = {
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
  items: CategoryLineItem[];
  next_offset: number;
};

const REPORT_PRESETS: { [key: string]: { props: PivotTableProps } } = {
  Default: {
    props: {
      cols: ["vendor"],
      rows: ["year", "month", "tx_id"],
      vals: ["amount"],
    },
  },
};

const fetchLineItems = async (categoryId: number): Promise<CategoryLineItem[]> => {
  const fetchNext = (offset: number): Promise<PaginatedReportResponse> =>
    axios
      .get("/api/reports/line-items-by-category/paginated", {
        params: { category_id: categoryId, offset, tz: TZ_OFFSET_HRS },
      })
      .then((r) => r.data);

  const allItems: CategoryLineItem[] = [];
  let offset = 0;

  do {
    const { items, next_offset } = await fetchNext(offset);
    allItems.push(...items);
    offset = items.length > 0 ? next_offset : 0;
  } while (offset > 0);

  return allItems;
};

const CategoryPicker = ({ categories, onSelect }: { categories: Category[]; onSelect: (c: Category) => void }) => (
  <ul className="list bg-base-100 rounded-box shadow-md m-4">
    <li className="p-4 pb-2 text-lg opacity-60 tracking-wide">Select a category:</li>
    {categories.map((category) => (
      <li className="list-row" key={category.id}>
        <span className="hover:underline cursor-pointer" onClick={() => onSelect(category)}>
          {category.name}
        </span>
      </li>
    ))}
  </ul>
);

const TransactionsByCategory = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const categories = sigCategories.value;

  const [tableProps, setTableProps] = useState(REPORT_PRESETS.Default.props);
  const [lineItems, setLineItems] = useState<CategoryLineItem[]>();
  const [resolvedCategory, setResolvedCategory] = useState<Category>();

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

  const loadCategory = useCallback(
    (category: Category) => {
      setResolvedCategory(category);
      setLineItems(undefined);
      fetchLineItems(category.id).then(setLineItems);
      if (!categoryId) {
        navigate(getCategoryReportPath(category.id), { replace: true });
      }
    },
    [categoryId, navigate],
  );

  useEffect(() => {
    if (categoryId) {
      const category = categories.find((c) => c.id === Number(categoryId));
      if (category) loadCategory(category);
    }
  }, [categoryId, categories.length]);

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

  if (!resolvedCategory && !categoryId) {
    return <CategoryPicker categories={categories} onSelect={loadCategory} />;
  }

  if (!lineItems) {
    return <div className="m-4 text-sm opacity-60">Loading...</div>;
  }

  const vendorNameLookup = sigVendors.value.reduce(
    (acc, { id, name }) => {
      acc[id] = name;
      return acc;
    },
    {} as Record<number, string>,
  );

  const rows = lineItems.map((lineItem) => ({
    vendor: vendorNameLookup[lineItem.vendor_id],
    ...lineItem,
  }));

  return (
    <div className="m-4">
      <div>
        <span className="text-lg">
          {resolvedCategory ? `Category Report — ${resolvedCategory.name}` : "Category Report"}
        </span>
        <button
          className="btn scale-50"
          onClick={() => {
            setLineItems(undefined);
            setResolvedCategory(undefined);
            navigate(ROUTE_PATHS.CATEGORY_REPORT, { replace: true });
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

export default TransactionsByCategory;
