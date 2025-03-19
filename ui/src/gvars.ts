import { signal } from "@preact/signals";
import toast from "react-hot-toast";

import { Category, Receipt, Transaction, Vendor } from "@/types";

import { axios } from "@/api";
import { sigUserInfo, upsertCategories, upsertReceipts, upsertTransactions, upsertVendors } from "@/store";

export const sigInitialLoadResult = signal<"PENDING" | "SUCCEEDED" | "FAILED">("PENDING");

type PaginationState = {
  offset: number;
  limit: number;
};

const receiptPagination = signal<PaginationState>({
  offset: 0,
  limit: 50,
});

const transactionPagination = signal<PaginationState>({
  offset: 0,
  limit: 50,
});

const vendorPagination = signal<PaginationState>({
  offset: 0,
  limit: 50,
});

const categoryPagination = signal<PaginationState>({
  offset: 0,
  limit: 50,
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
      };
      upsertReceipts(items);
    })
    .catch((e) => {
      console.error(e);
    });

export const fetchTransactions = () =>
  axios
    .get("/api/transactions/paginated", {
      params: { ...transactionPagination.value },
    })
    .then((r) => r.data)
    .then(({ next_offset, items }: { next_offset: number; items: Transaction[] }) => {
      transactionPagination.value = {
        ...transactionPagination.value,
        offset: next_offset,
      };
      upsertTransactions(items);
    })
    .catch((e) => {
      console.error(e);
    });

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
      };
      upsertVendors(items);
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
      };
      upsertCategories(items);
    })
    .catch((e) => {
      console.error(e);
    });

export const fetchUserInfo = () =>
  axios
    .get("/api/me")
    .then((r) => r.data)
    .then((userInfo) => {
      sigUserInfo.value = userInfo;
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
