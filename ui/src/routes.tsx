import { ReactNode } from "preact/compat";

import Invite from "@/components/Invite";
import ReceiptView from "@/components/ReceiptView";

import "./app.scss";

type RouteEntry = {
  path: string;
  name: string;
  description: string;
  component: () => ReactNode;
};

export const AUTHENTICATED_ROUTES: RouteEntry[] = [
  { path: "/", name: "Receipts", description: "Upload and manage receipts", component: ReceiptView },
  // TODO: change this to manager users
  { path: "/invite", name: "Invite Users", description: "Invite friends to use divvy", component: Invite },
];
