import { Signal, signal } from "@preact/signals";
import toast from "react-hot-toast";

import { axios } from "@/api";
import { sigUserInfo, upsertCategories, upsertReceipts, upsertTransactions, upsertVendors } from "@/store";

export const sigInitialLoadResult = signal<"PENDING" | "SUCCEEDED" | "FAILED">("PENDING");

type PaginationState = {
  offset: number;
  limit: number;
  isExausted: boolean;
};

export const receiptPagination = signal<PaginationState>({
  offset: 0,
  limit: 500, // TODO: load enough receipts to fill the view (for handleScroll to start working. load 500 for now.)
  isExausted: false,
});

export const transactionPagination = signal<PaginationState>({
  offset: 0,
  limit: 50,
  isExausted: false,
});

const vendorPagination = signal<PaginationState>({
  offset: 0,
  limit: 50,
  isExausted: false,
});

const categoryPagination = signal<PaginationState>({
  offset: 0,
  limit: 500, // TODO: make sure all categories are in memory on initial load. 500 should be enough for now.
  isExausted: false,
});

const fetchPaginatedData =
  <T>(url: string, sigPagination: Signal<PaginationState>, upsert: ({ items }: { items: T[] }) => void) =>
  () => {
    if (sigPagination.value.isExausted) {
      return Promise.resolve();
    }

    return axios
      .get(url, {
        params: { ...sigPagination.value },
      })
      .then((r) => r.data)
      .then(({ next_offset, items }: { next_offset: number; items: T[] }) => {
        sigPagination.value.offset = next_offset;
        sigPagination.value.isExausted = items.length === 0;

        upsert({ items });
      });
  };

// TODO: should not need to fetch everything on initial load.
// The UI should be able to handle partial data and fetch more as needed. Ex. vendor dropdown in the transaction form.
const fetchUntilExhausted = <T>(
  url: string, sigPagination: Signal<PaginationState>, upsert: ({ items }: { items: T[] }) => void
) => () => {
  return new Promise<void>((resolve, reject) => {
    const fetchFunction = fetchPaginatedData(url, sigPagination, upsert);

    const fetchNext = () => {
      fetchFunction()
        .then(() => {
          if (!sigPagination.value.isExausted) {
            fetchNext();
          } else {
            resolve();
          }
        })
        .catch((e) => {
          reject(e);
        });
    };

    fetchNext();
  });
};

export const fetchReceipts = fetchPaginatedData("/api/receipts/paginated", receiptPagination, upsertReceipts);

export const fetchTransactions = fetchPaginatedData(
  "/api/transactions/paginated",
  transactionPagination,
  upsertTransactions,
);

const fetchVendors = fetchUntilExhausted("/api/vendors/paginated", vendorPagination, upsertVendors);

const fetchCategories = fetchUntilExhausted("/api/categories/paginated", categoryPagination, upsertCategories);

const fetchUserInfo = () =>
  axios
    .get("/api/me")
    .then((r) => r.data)
    .then((userInfo) => {
      const { config, ...rest } = userInfo;
      sigUserInfo.value = {
        ...rest,
        config: {
          tax_rate: config.tax_rate || 0,
          currency_decimal_places: config.currency_decimal_places || 2,
          advanced_mode: config.advanced_mode || false,
          notes: config.notes || "",
        },
      };
    })
    .catch((e) => {
      console.error(e);
      // TODO: handle error
    });

export const fetchInitialData = () => {
  Promise.allSettled([fetchReceipts(), fetchTransactions(), fetchUserInfo(), fetchVendors(), fetchCategories()])
    .then((result) => result.filter(({ status }) => status === "fulfilled"))
    .then((isSuccessful) => {
      if (isSuccessful) {
        sigInitialLoadResult.value = "SUCCEEDED";
      } else {
        sigInitialLoadResult.value = "FAILED";
        toast.error("Initial load failed. Check console logs.");
      }
    });
};
