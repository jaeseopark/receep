import { ChartLine, NotebookPen, Receipt, Settings as SettingsIcon } from "lucide-preact";
import { ReactNode } from "preact/compat";

import Reports from "@/components/Reports";
import Settings from "@/components/Settings";
import TransactionEditView from "@/components/TransactionEditView";
import TransactionsTable from "@/components/Transactions";
import ReceiptEditView from "@/components/receipts/ReceiptEditView";
import ReceiptsView from "@/components/receipts/ReceiptsView";

type RouteEntry = {
  path: string;
  name: string;
  description: string;
  component: () => ReactNode;
  icon?: ReactNode;
};

export const AUTHENTICATED_ROUTES: RouteEntry[] = [
  {
    path: "/receipts",
    name: "Receipts",
    description: "Upload and manage receipts",
    component: ReceiptsView,
    icon: <Receipt />,
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
    icon: <NotebookPen />,
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
    icon: <ChartLine />,
  },
  {
    path: "/settings",
    name: "Settings",
    description: "Manage application settings",
    component: Settings,
    icon: <SettingsIcon />,
  },
];
