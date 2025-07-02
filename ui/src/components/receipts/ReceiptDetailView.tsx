import { NotebookPen, Replace, Trash } from "lucide-preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

import { Receipt } from "@/types";

import { axios } from "@/api";
import ActionButtons, { ActionButton } from "@/components/ActionButtons";
import ReceiptDetailForm from "@/components/receipts/ReceiptForm";
import { AddReceiptInputElement } from "@/components/receipts/ReceiptGridActionsButtons";
import { ReceiptHighres } from "@/components/receipts/ReceiptImg";
import { ROUTE_PATHS } from "@/const";
import { sigInitialLoadResult } from "@/gvars";
import useSimpleConfirmationDialog from "@/hooks/useSimpleConfirmationDialog";
import { removeReceipt, removeTransaction, sigReceipts, sigUserInfo, upsertReceipts } from "@/store";
import { getNewTransactionPathWithReceiptId } from "@/utils/paths";
import { isPositiveInteger } from "@/utils/primitive";

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
      show: true,
      onClick: () => navigate(getNewTransactionPathWithReceiptId(receipt.id)),
      icon: <NotebookPen />,
    },
    {
      name: "Delete Receipt",
      buttonClass: "bg-red-500 hover:bg-red-600 text-white",
      show: sigUserInfo.value?.user_id === receipt.user_id,
      onClick: showDeleteConfirmation,
      icon: <Trash />,
    },
    {
      name: "Replace Receipt",
      buttonClass: "bg-gray-500 hover:bg-gray-600 text-white",
      show: sigUserInfo.value?.user_id === receipt.user_id,
      sibling: (
        <AddReceiptInputElement
          id="replace-receipt-input"
          onChange={(e) => {
            const [file] = Array.from((e?.target as HTMLInputElement).files!);
            const formData = new FormData();
            formData.append("file", file, file.name);

            axios
              .put(`/api/receipts/${receipt.id}`, formData, {
                headers: {
                  "Content-Type": "application/json",
                },
              })
              .then((r) => r.data)
              .then((newReceipt) => {
                upsertReceipts({ items: [newReceipt] });
                toast.success("Receipt replaced.");
              });
          }}
        />
      ),
      onClick: () => document.getElementById("replace-receipt-input")?.click(),
      icon: <Replace />,
    },
  ];

  return (
    <div className="receipt-edit-view">
      <div className="overflow-x-hidden object-cover md:flex">
        <ReceiptHighres receipt={receipt} />
        <ReceiptDetailForm receipt={receipt} />
      </div>
      <ActionButtons buttons={buttons} />
      {deleteConfirmationDialog}
    </div>
  );
};

export default ReceiptEditView;
