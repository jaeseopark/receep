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
  EXPENSE_REPORT = "/reports/expenses-by-category",

  // Settings:
  SETTINGS = "/settings",
  USER_CONFIGS = "/settings/configs",
  INVITE = "/settings/invite",
  DATA = "/settings/data",

  CATEGORIES = "/settings/categories",
  EDIT_CATEGORY = "/settings/categories/edit/:id",
  NEW_CATEGORY = "/settings/categories/edit/-1",
}
