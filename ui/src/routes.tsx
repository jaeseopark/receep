import { BookUser, ChartLine, Database, Dot, NotebookPen, Receipt, Settings as SettingsIcon, Store } from "lucide-preact";
import { ReactNode } from "preact/compat";

import DataImportExport from "@/components/DataImportExport";
import Invite from "@/components/Invite";
import Settings from "@/components/Settings";
import CategoryDetailView from "@/components/categories/CategoryDetailView";
import CategoryListView from "@/components/categories/CategoryListView";
import VendorDetailView from "@/components/vendors/VendorDetailView";
import VendorListView from "@/components/vendors/VendorListView";
import ReceiptEditView from "@/components/receipts/ReceiptDetailView";
import ReceiptsView from "@/components/receipts/ReceiptGridView";
import ExpensesByCategory from "@/components/reports/ExpensesByCategory";
import Reports from "@/components/reports/Reports";
import TransactionDetailView from "@/components/transactions/TransactionDetailView";
import TransactionsTable from "@/components/transactions/Transactions";
import Config from "@/components/user/Config";
import { ROUTE_PATHS } from "@/const";

type RouteEntry = {
  path: string;
  name: string;
  description: string;
  component: () => ReactNode;
  icon?: ReactNode;
  type: "DOCKED" | "NOT_DOCKED";
};

const REPORT_ROUTES: RouteEntry[] = [
  {
    path: ROUTE_PATHS.EXPENSE_REPORT,
    name: "Expenses By Category",
    description: "Categorized expense summary",
    component: ExpensesByCategory,
    type: "NOT_DOCKED",
  },
];

const SETTING_ROUTES: RouteEntry[] = [
  {
    path: ROUTE_PATHS.USER_CONFIGS,
    name: "User Configs",
    description: "Manage Configs",
    component: Config,
    icon: <SettingsIcon />, // duplicate.. find new?
    type: "NOT_DOCKED",
  },
  {
    path: ROUTE_PATHS.CATEGORIES,
    name: "Manage Categories",
    description: "Manage line item categories",
    component: CategoryListView,
    icon: <Dot />, // TODO: use a better icon
    type: "NOT_DOCKED",
  },
  {
    path: ROUTE_PATHS.EDIT_CATEGORY,
    name: "Edit Category",
    description: "Edit Category",
    component: CategoryDetailView,
    type: "NOT_DOCKED",
  },
  {
    path: ROUTE_PATHS.VENDORS,
    name: "Manage Vendors",
    description: "Manage vendors",
    component: VendorListView,
    icon: <Store />,
    type: "NOT_DOCKED",
  },
  {
    path: ROUTE_PATHS.EDIT_VENDOR,
    name: "Edit Vendor",
    description: "Edit Vendor",
    component: VendorDetailView,
    type: "NOT_DOCKED",
  },
  {
    path: ROUTE_PATHS.INVITE,
    name: "Invite Users",
    description: "Invite friends to use Receep",
    component: Invite,
    icon: <BookUser />,
    type: "NOT_DOCKED",
  },
  {
    path: ROUTE_PATHS.DATA,
    name: "Data",
    description: "Manage data (import/export)",
    component: DataImportExport,
    icon: <Database />,
    type: "NOT_DOCKED",
  },
];

export const AUTHENTICATED_ROUTES: RouteEntry[] = [
  {
    path: ROUTE_PATHS.RECEIPTS,
    name: "Receipts",
    description: "Upload and manage receipts",
    component: () => <ReceiptsView />,
    icon: <Receipt />,
    type: "DOCKED",
  },
  {
    path: ROUTE_PATHS.EDIT_RECEIPT,
    name: "Edit Receipt",
    description: "View and edit a receipt",
    component: ReceiptEditView,
    type: "NOT_DOCKED",
  },
  {
    path: ROUTE_PATHS.TRANSACTIONS,
    name: "Transactions",
    description: "Manage transactions",
    component: TransactionsTable,
    icon: <NotebookPen />,
    type: "DOCKED",
  },
  {
    path: ROUTE_PATHS.EDIT_TRANSACTION,
    name: "Edit Transaction",
    description: "Edit transaction",
    component: TransactionDetailView,
    type: "NOT_DOCKED",
  },
  {
    path: ROUTE_PATHS.REPORTS,
    name: "Reports",
    description: "Data visualization and drilldown reporting",
    component: () => <Reports reportRoutes={REPORT_ROUTES} />,
    icon: <ChartLine />,
    type: "DOCKED",
  },
  {
    path: ROUTE_PATHS.SETTINGS,
    name: "Settings",
    description: "Manage application settings",
    component: () => <Settings routes={SETTING_ROUTES} />,
    icon: <SettingsIcon />,
    type: "DOCKED",
  },
  ...REPORT_ROUTES,
  ...SETTING_ROUTES,
];
