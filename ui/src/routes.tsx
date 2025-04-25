import { BookUser, ChartLine, Database, Dot, NotebookPen, Receipt, Settings as SettingsIcon } from "lucide-preact";
import { ReactNode } from "preact/compat";

import DataImportExport from "@/components/DataImportExport";
import Invite from "@/components/Invite";
import Settings from "@/components/Settings";
import CategoryDetailView from "@/components/categories/CategoryDetailView";
import CategoryListView from "@/components/categories/CategoryListView";
import ReceiptEditView from "@/components/receipts/ReceiptDetailView";
import ReceiptsView from "@/components/receipts/ReceiptGridView";
import ExpensesByCategory from "@/components/reports/ExpensesByCategory";
import Reports from "@/components/reports/Reports";
import TransactionEditView from "@/components/transactions/TransactionDetailView";
import TransactionsTable from "@/components/transactions/Transactions";

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
    path: "/reports/expenses-by-category",
    name: "Expenses By Category",
    description: "Categorized expense summary",
    component: ExpensesByCategory,
    type: "NOT_DOCKED",
  },
];

const SETTING_ROUTES: RouteEntry[] = [
  {
    path: "/settings/categories",
    name: "Manage Categories",
    description: "Manage line item categories",
    component: CategoryListView,
    icon: <Dot />, // TODO: use a better icon
    type: "NOT_DOCKED",
  },
  {
    path: "/settings/categories/edit/:id",
    name: "Edit Category",
    description: "Edit Category",
    component: CategoryDetailView,
    type: "NOT_DOCKED",
  },
  {
    path: "/settings/invite",
    name: "Invite Users",
    description: "Invite friends to use Receep",
    component: Invite,
    icon: <BookUser />,
    type: "NOT_DOCKED",
  },
  {
    path: "/settings/data",
    name: "Data",
    description: "Manage data (import/export)",
    component: DataImportExport,
    icon: <Database />,
    type: "NOT_DOCKED",
  },
];

export const AUTHENTICATED_ROUTES: RouteEntry[] = [
  {
    path: "/receipts",
    name: "Receipts",
    description: "Upload and manage receipts",
    component: () => <ReceiptsView />,
    icon: <Receipt />,
    type: "DOCKED",
  },
  {
    path: "/receipts/edit/:id",
    name: "Edit Receipt",
    description: "View and edit a receipt",
    component: ReceiptEditView,
    type: "NOT_DOCKED",
  },
  {
    path: "/transactions",
    name: "Transactions",
    description: "Manage transactions",
    component: TransactionsTable,
    icon: <NotebookPen />,
    type: "DOCKED",
  },
  {
    path: "/transactions/edit/:id",
    name: "Edit Transaction",
    description: "Edit transaction",
    component: TransactionEditView,
    type: "NOT_DOCKED",
  },
  {
    path: "/transactions/new",
    name: "New Transaction",
    description: "Create transaction",
    component: TransactionEditView,
    type: "NOT_DOCKED",
  },
  {
    path: "/reports",
    name: "Reports",
    description: "Data visualization and drilldown reporting",
    component: () => <Reports reportRoutes={REPORT_ROUTES} />,
    icon: <ChartLine />,
    type: "DOCKED",
  },
  {
    path: "/settings",
    name: "Settings",
    description: "Manage application settings",
    component: () => <Settings routes={SETTING_ROUTES} />,
    icon: <SettingsIcon />,
    type: "DOCKED",
  },
  ...REPORT_ROUTES,
  ...SETTING_ROUTES,
];
