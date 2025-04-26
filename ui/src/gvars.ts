import { signal } from "@preact/signals";
import toast from "react-hot-toast";

import { Category, Receipt, Transaction, Vendor } from "@/types";

import { axios } from "@/api";
import { sigUserInfo, upsertCategories, upsertReceipts, upsertTransactions, upsertVendors } from "@/store";

export const sigInitialLoadResult = signal<"PENDING" | "SUCCEEDED" | "FAILED">("PENDING");

type PaginationState = {
  offset: number;
  limit: number;
  isExausted: boolean;
};

const receiptPagination = signal<PaginationState>({
  offset: 0,
  limit: 50,
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
  limit: 50,
  isExausted: false,
});

export const fetchReceipts = () =>
  axios
    .get("/api/receipts/paginated", {
      params: { ...receiptPagination.value },
    })
    .then((r) => r.data)
    .then(({ next_offset, items }: { next_offset: number; items: Receipt[] }) => {
      receiptPagination.value = {
        ...receiptPagination.value,
        offset: next_offset,
        isExausted: items.length === 0,
      };
      upsertReceipts({ items });
    })
    .catch((e) => {
      console.error(e);
    });

export const fetchTransactions = () => {
  if (transactionPagination.value.isExausted) {
    return;
  }

  return axios
    .get("/api/transactions/paginated", {
      params: { ...transactionPagination.value },
    })
    .then((r) => r.data)
    .then(({ next_offset, items }: { next_offset: number; items: Transaction[] }) => {
      transactionPagination.value = {
        ...transactionPagination.value,
        offset: next_offset,
        isExausted: items.length === 0,
      };
      upsertTransactions({ items });
    })
    .catch((e) => {
      console.error(e);
    });
};
export const fetchVendors = () =>
  axios
    .get("/api/vendors/paginated", {
      params: { ...vendorPagination.value },
    })
    .then((r) => r.data)
    .then(({ next_offset, items }: { next_offset: number; items: Vendor[] }) => {
      vendorPagination.value = {
        ...vendorPagination.value,
        offset: next_offset,
        isExausted: items.length === 0,
      };
      upsertVendors({ items });
    })
    .catch((e) => {
      console.error(e);
    });

export const fetchCategories = () =>
  axios
    .get("/api/categories/paginated", {
      params: { ...categoryPagination.value },
    })
    .then((r) => r.data)
    .then(({ next_offset, items }: { next_offset: number; items: Category[] }) => {
      categoryPagination.value = {
        ...categoryPagination.value,
        offset: next_offset,
        isExausted: items.length === 0,
      };
      upsertCategories({ items });
    })
    .catch((e) => {
      console.error(e);
    });

export const fetchUserInfo = () =>
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
