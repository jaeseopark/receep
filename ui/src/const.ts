export enum ROUTE_PATHS {
  // Common:
  HOME = "/",
  LOGIN = "/login",
  SIGNUP = "/signup",

  // Receipts:
  RECEIPTS = "/receipts",
  EDIT_RECEIPT = "/receipts/edit/:id",

  // Transactions:
  TRANSACTIONS = "/transactions",
  EDIT_TRANSACTION = "/transactions/edit/:id",
  NEW_TRANSACTION = "/transactions/edit/-1",

  // Reports:
  REPORTS = "/reports",
  EXPENSE_REPORT = "/reports/annual-expense-report",
  VENDOR_REPORT = "/reports/transactions-by-vendor",
  VENDOR_REPORT_FOR_VENDOR = "/reports/transactions-by-vendor/:vendorId",
  CATEGORY_REPORT = "/reports/transactions-by-category",
  CATEGORY_REPORT_FOR_CATEGORY = "/reports/transactions-by-category/:categoryId",

  // Settings:
  SETTINGS = "/settings",
  USER_CONFIGS = "/settings/configs",
  INVITE = "/settings/invite",
  DATA = "/settings/data",

  CATEGORIES = "/settings/categories",
  EDIT_CATEGORY = "/settings/categories/edit/:id",
  NEW_CATEGORY = "/settings/categories/edit/-1",

  VENDORS = "/settings/vendors",
  EDIT_VENDOR = "/settings/vendors/edit/:id",
  NEW_VENDOR = "/settings/vendors/edit/-1",
}
