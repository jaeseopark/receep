import { NotebookPen, Trash } from "lucide-preact";
import { ReactNode } from "preact/compat";
import { useCallback, useEffect, useState } from "preact/hooks";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

import { Receipt } from "@/types";

import { axios } from "@/api";
import ReceiptDetailForm from "@/components/receipts/ReceiptForm";
import { ReceiptHighres } from "@/components/receipts/ReceiptImg";
import { ROUTE_PATHS } from "@/const";
import { sigInitialLoadResult } from "@/gvars";
import useSimpleConfirmationDialog from "@/hooks/useSimpleConfirmationDialog";
import { removeReceipt, removeTransaction, sigReceipts } from "@/store";
import { getNewTransactionPathWithReceiptId } from "@/utils/paths";
import { isPositiveInteger } from "@/utils/primitive";

type ActionButton = {
  name: string;
  containerClass?: string;
  buttonClass?: string;
  enabled: boolean;
  icon: ReactNode;
  onClick: () => void;
};

const ReceiptEditView = () => {
  const { id } = useParams();
  const [receipt, setReceipt] = useState<Receipt>();
  const navigate = useNavigate();

  const deleteReceipt = useCallback(() => {
    if (!receipt) {
      return;
    }

    axios
      .delete(`/api/receipts/${receipt.id}`, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      .then(() => {
        removeReceipt(receipt.id);
        receipt.transactions.map(({ id }) => id).forEach(removeTransaction);
        toast.success("Receipt deleted.");
        navigate(ROUTE_PATHS.RECEIPTS);
      });
  }, [receipt]);

  const { show: showDeleteConfirmation, dialog: deleteConfirmationDialog } = useSimpleConfirmationDialog({
    dialogId: "delete-receipt",
    title: "Delete Receipt",
    question: "Are you sure you want to delete this receipt? This action cannot be undone.",
    choices: [
      {
        label: "Delete",
        onClick: deleteReceipt,
        isPrimary: true,
      },
      {
        label: "Cancel",
        onClick: () => {},
      },
    ],
  });

  useEffect(() => {
    const init = () => {
      if (sigInitialLoadResult.value === "PENDING") {
        setTimeout(init, 100);
        return;
      }

      if (!isPositiveInteger(id)) {
        toast.error(`The Receipt ID is not a valid integer. id='${id}'`);
        return;
      }

      // TODO make sure Sigreceipt value is popualted first.
      const [r] = sigReceipts.value.filter((r) => r.id === Number.parseInt(id!));
      if (!r) {
        toast.error(`The requested Receipt ID does not exist. id='${id}'`);
        return;
      }

      setReceipt(r);
    };

    setTimeout(init, 100);
  }, [sigReceipts.value]);

  if (!receipt) {
    return <div>Loading...</div>;
  }

  const buttons: ActionButton[] = [
    {
      name: "Add Transaction",
      buttonClass: "btn-primary",
      enabled: receipt.transactions.length === 0,
      onClick: () => navigate(getNewTransactionPathWithReceiptId(receipt.id)),
      icon: <NotebookPen />,
    },
    {
      name: "Delete Receipt",
      buttonClass: "bg-red-500 hover:bg-red-600 text-white",
      enabled: true,
      onClick: showDeleteConfirmation,
      icon: <Trash />,
    },
  ];

  // TODO: make the image maintain its aspect ratio
  return (
    <div className="receipt-edit-view">
      <div className="overflow-x-hidden object-cover md:flex">
        <ReceiptHighres receipt={receipt} />
        <ReceiptDetailForm receipt={receipt} />
      </div>
      {buttons
        .filter(({ enabled }) => enabled)
        .map(({ name, icon, containerClass, buttonClass, onClick: handleClick }, i) => {
          const rightOffset = 6 + 14 * i;
          return (
            <div key={name} className={`bottom-24 fixed right-${rightOffset} shadow-lg rounded-full ${containerClass}`}>
              <button className={`btn btn-circle ${buttonClass}`} onClick={handleClick}>
                {icon}
              </button>
            </div>
          );
        })}
      {deleteConfirmationDialog}
    </div>
  );
};

export default ReceiptEditView;
