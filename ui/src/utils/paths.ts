import { ROUTE_PATHS } from "@/const";

export const getEditReceiptPath = (id: number) => {
  return ROUTE_PATHS.EDIT_RECEIPT.replace(":id", id.toString());
};

export const getEditTransactionPath = (id: number) => {
  return ROUTE_PATHS.EDIT_TRANSACTION.replace(":id", id.toString());
};

export const getEditCategoryPath = (id: number) => {
  return ROUTE_PATHS.EDIT_CATEGORY.replace(":id", id.toString());
};

export const getNewTransactionPathWithReceiptId = (receiptId: number) => {
  return ROUTE_PATHS.NEW_TRANSACTION + `?receipt_id=${receiptId}`;
};
