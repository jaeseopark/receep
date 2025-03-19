import { ChartLine, NotebookPen, Receipt, Settings as SettingsIcon } from "lucide-preact";
import { ReactNode } from "preact/compat";

import Invite from "@/components/Invite";
import Reports from "@/components/Reports";
import Settings from "@/components/Settings";
import CategoryListView from "@/components/categories/CategoryListView";
import ReceiptEditView from "@/components/receipts/ReceiptDetailView";
import ReceiptsView from "@/components/receipts/ReceiptGridView";
import TransactionEditView from "@/components/transactions/TransactionDetailView";
import TransactionsTable from "@/components/transactions/Transactions";

type RouteEntry = {
  path: string;
  name: string;
  description: string;
  component: () => ReactNode;
  dockIcon?: ReactNode;
};

export const AUTHENTICATED_ROUTES: RouteEntry[] = [
  {
    path: "/receipts",
    name: "Receipts",
    description: "Upload and manage receipts",
    component: () => <ReceiptsView />,
    dockIcon: <Receipt />,
  },
  {
    path: "/receipts/edit/:id",
    name: "Edit Receipt",
    description: "View and edit a receipt",
    component: ReceiptEditView,
  },
  {
    path: "/transactions",
    name: "Transactions",
    description: "Manage transactions",
    component: TransactionsTable,
    dockIcon: <NotebookPen />,
  },
  {
    path: "/transactions/edit/:id",
    name: "Edit Transaction",
    description: "Edit transaction",
    component: TransactionEditView,
  },
  {
    path: "/transactions/new",
    name: "New Transaction",
    description: "Create transaction",
    component: TransactionEditView,
  },
  {
    path: "/reports",
    name: "Reports",
    description: "Data visualization and drilldown reporting",
    component: Reports,
    dockIcon: <ChartLine />,
  },
  {
    path: "/settings",
    name: "Settings",
    description: "Manage application settings",
    component: Settings,
    dockIcon: <SettingsIcon />,
  },
  {
    path: "/settings/categories",
    name: "Categories",
    description: "Manage line item categories",
    component: CategoryListView,
  },
  {
    path: "/settings/invite",
    name: "Invite",
    description: "Invite Users",
    component: Invite,
  },
];
