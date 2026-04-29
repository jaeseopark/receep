import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { Category, Transaction, Vendor } from "@/types";

import { axios } from "@/api";
import { ROUTE_PATHS } from "@/const";
import useAutoTax from "@/hooks/useAutoTax";
import useSimpleConfirmationDialog from "@/hooks/useSimpleConfirmationDialog";
import {
  removeTransaction,
  sigCategories,
  sigReceipts,
  sigUserInfo,
  sigVendors,
  upsertCategories,
  upsertReceipts,
  upsertTransactions,
  upsertVendors,
} from "@/store";
import { getEditTransactionPath } from "@/utils/paths";

import TransactionFormView from "@/components/transactions/TransactionFormView";
import { useCallback } from "preact/hooks";

const DEFAULT_FIELD_ID = 0;

type FormData = Transaction & { enableAutoTax: boolean };

/**
 * Wrapper component that wires TransactionFormView to the global application
 * state (signals), the API layer, and the router. Prefer using
 * TransactionFormView directly when you need an isolated / testable component.
 */
const TransactionForm = ({ transaction, returnTo }: { transaction: Transaction; returnTo?: string }) => {
  const navigate = useNavigate();
  const { applyAutoTax } = useAutoTax();
  const userInfo = sigUserInfo.value!;

  const handleSave = useCallback(
    (formData: FormData) => {
      const isMyTransaction = userInfo.user_id === transaction.user_id;
      if (!isMyTransaction) {
        return;
      }

      const isNewTransaction = transaction.id === -1;
      const { enableAutoTax, ...t } = formData;
      let apiPromise;

      if (isNewTransaction) {
        if (enableAutoTax) {
          applyAutoTax(formData);
        }
        apiPromise = axios.post("/api/transactions", formData, {
          headers: { "Content-Type": "application/json" },
        });
      } else {
        apiPromise = axios.put(`/api/transactions/${t.id}`, formData, {
          headers: { "Content-Type": "application/json" },
        });
      }

      apiPromise
        .then((r) => r.data)
        .then((savedTransaction: Transaction) => {
          upsertTransactions({ items: [savedTransaction], toFront: true });
          if (savedTransaction.receipt_id) {
            const receipt = sigReceipts.value.find(({ id }) => id === savedTransaction.receipt_id);
            if (!receipt) {
              return;
            }
            const existingRef = receipt.transactions.find(({ id }) => id === savedTransaction.id);
            if (!existingRef) {
              receipt.transactions.push(savedTransaction);
            }
            upsertReceipts({ items: [receipt] });
          } else {
            // TODO: clear transaction reference from the receipt object
          }
        })
        .then(() => {
          toast.success("Transaction saved.");
          navigate(returnTo ?? ROUTE_PATHS.TRANSACTIONS);
        })
        .catch(() => {
          // TODO
        });
    },
    [userInfo, transaction, applyAutoTax, navigate, returnTo],
  );

  const handleDelete = useCallback(() => {
    axios
      .delete(`/api/transactions/${transaction.id}`, {
        headers: { "Content-Type": "application/json" },
      })
      .then(() => {
        removeTransaction(transaction.id);
        toast.success("Transaction deleted.");
        navigate(ROUTE_PATHS.TRANSACTIONS);
      });
  }, [transaction.id, navigate]);

  const { show: showDeleteConfirmation, dialog: deleteConfirmationDialog } = useSimpleConfirmationDialog({
    dialogId: "delete-transaction",
    title: "Delete Transaction",
    question: "Are you sure you want to delete this transaction? This action cannot be undone.",
    choices: [
      {
        label: "Delete",
        onClick: handleDelete,
        isPrimary: true,
      },
      {
        label: "Cancel",
        onClick: () => {},
      },
    ],
  });

  const handleCreateVendor = useCallback(
    (name: string): Promise<number> => {
      const newVendor: Vendor = {
        id: DEFAULT_FIELD_ID,
        user_id: DEFAULT_FIELD_ID,
        name,
      };
      return axios
        .post("/api/vendors", newVendor, {})
        .then((r) => r.data)
        .then((returnedVendor) => {
          upsertVendors({ items: [returnedVendor] });
          return returnedVendor.id as number;
        });
    },
    [],
  );

  const handleCreateCategory = useCallback(
    (categoryName: string): Promise<number> => {
      const category: Category = {
        id: DEFAULT_FIELD_ID,
        user_id: DEFAULT_FIELD_ID,
        name: categoryName,
        description: "Auto-Generated from a transaction",
        with_autotax: true,
      };
      return axios
        .post("/api/categories", category)
        .then((r) => r.data)
        .then((returnedCategory: Category) => {
          upsertCategories({ items: [returnedCategory] });
          return returnedCategory.id;
        });
    },
    [],
  );

  const handleCloneSuccess = useCallback(
    (newId: number) => {
      navigate(getEditTransactionPath(newId));
    },
    [navigate],
  );

  return (
    <>
      {deleteConfirmationDialog}
      <TransactionFormView
        transaction={transaction}
        vendors={sigVendors.value}
        categories={sigCategories.value}
        receipts={sigReceipts.value}
        userInfo={userInfo}
        onSave={handleSave}
        onDelete={showDeleteConfirmation}
        onCloneSuccess={handleCloneSuccess}
        onCreateVendor={handleCreateVendor}
        onCreateCategory={handleCreateCategory}
      />
    </>
  );
};

export default TransactionForm;
