import { LineItem, Transaction } from "@/types";

export const createLineItem = (transaction: Transaction): LineItem => ({
  id: Date.now(),
  name: "",
  transaction_id: transaction.id!,
  amount_input: "",
  amount: 0,
  category_id: 0,
});
