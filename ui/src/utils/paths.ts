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

export const getEditVendorPath = (id: number) => {
  return ROUTE_PATHS.EDIT_VENDOR.replace(":id", id.toString());
};

export const getNewTransactionPathWithReceiptId = (receiptId: number) => {
  return ROUTE_PATHS.NEW_TRANSACTION + `?receipt_id=${receiptId}`;
};

export const getVendorReportPath = (vendorId: number) => {
  return ROUTE_PATHS.VENDOR_REPORT_FOR_VENDOR.replace(":vendorId", vendorId.toString());
};

export const getCategoryReportPath = (categoryId: number) => {
  return ROUTE_PATHS.CATEGORY_REPORT_FOR_CATEGORY.replace(":categoryId", categoryId.toString());
};
