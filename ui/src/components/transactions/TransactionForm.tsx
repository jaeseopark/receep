import { Save, ZoomIn } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { Receipt, Transaction } from "@/types";

import { sigReceipts } from "@/store";

import { ReceiptHighres } from "../receipts/ReceiptImg";

const TransactionForm = ({ transaction }: { transaction: Transaction }) => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: transaction,
  });
  const receiptId = watch("receipt_id");
  const [receipt, setReceipt] = useState<Receipt>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "line_items",
  });

  useEffect(() => {
    if (!receiptId) {
      return;
    }
    const [r] = sigReceipts.value.filter((r) => r.id === receiptId);
    if (r) {
      setReceipt(r);
    }
  }, [receiptId]);

  /* ----------------
   * End of hooks
   * ---------------- */

  const renderVendorField = () => {
    return (
      <label className="block">
        <span className="text-gray-700">Vendor</span>
        <input
          {...register("vendor")}
          className="mt-1 block w-full p-2 border rounded"
          placeholder="(Optional) Ex. Walmart"
        />
      </label>
    );
  };

  const renderNotesField = () => {
    return (
      <label className="block">
        <span className="text-gray-700">Notes</span>
        <textarea
          {...register("notes")}
          className="mt-1 block w-full p-2 border rounded"
          placeholder="Additional notes"
        ></textarea>
      </label>
    );
  };

  const renderSimpleForm = () => {
    return (
      <>
        {renderVendorField()}
        {renderNotesField()}
      </>
    );
  };

  const renderAdvancedForm = () => {
    return (
      <>
        <label className="block">
          <span className="text-gray-700">Vendor</span>
          <input
            {...register("vendor")}
            className="mt-1 block w-full p-2 border rounded"
            placeholder="Enter vendor name"
          />
        </label>
        <h3 className="text-lg font-semibold">Line Items</h3>
        {fields.map((item, index) => (
          <div key={item.id} className="p-4 border rounded-lg space-y-2">
            <label className="block">
              <span className="text-gray-700">Name</span>
              <input
                {...register(`line_items.${index}.name`)}
                className="mt-1 block w-full p-2 border rounded"
                placeholder="Item name"
              />
            </label>

            <label className="block">
              <span className="text-gray-700">Amount</span>
              <input
                type="number"
                {...register(`line_items.${index}.amount`)}
                className="mt-1 block w-full p-2 border rounded"
              />
            </label>

            <label className="block">
              <span className="text-gray-700">Category ID</span>
              <input
                type="number"
                {...register(`line_items.${index}.category_id`)}
                className="mt-1 block w-full p-2 border rounded"
              />
            </label>

            <label className="block">
              <span className="text-gray-700">Biz Portion Input</span>
              <input
                {...register(`line_items.${index}.biz_portion_input`)}
                className="mt-1 block w-full p-2 border rounded"
              />
            </label>

            <label className="block">
              <span className="text-gray-700">Biz Portion</span>
              <input
                type="number"
                {...register(`line_items.${index}.biz_portion`)}
                className="mt-1 block w-full p-2 border rounded"
              />
            </label>

            <label className="block">
              <span className="text-gray-700">Notes</span>
              <textarea
                {...register(`line_items.${index}.notes`)}
                className="mt-1 block w-full p-2 border rounded"
                placeholder="Item notes"
              ></textarea>
            </label>

            <button
              type="button"
              className="mt-2 bg-red-500 text-white px-4 py-2 rounded"
              onClick={() => remove(index)}
            >
              Remove
            </button>
          </div>
        ))}

        <button
          type="button"
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() =>
            append({
              id: Date.now(),
              name: "",
              transaction_id: transaction.id!,
              amount: 0,
              category_id: 0,
              biz_portion_input: "",
              biz_portion: 0,
            })
          }
        >
          Add Line Item
        </button>
        <label className="block">
          <span className="text-gray-700">Notes</span>
          <textarea
            {...register("notes")}
            className="mt-1 block w-full p-2 border rounded"
            placeholder="Additional notes"
          ></textarea>
        </label>
      </>
    );
  };

  const title = transaction.id === -1 ? "New Transaction" : "Edit Transaction";

  return (
    <>
      <form onSubmit={handleSubmit(console.log)} className="space-y-4 p-4">
        <h2 className="text-xl font-bold">{title}</h2>

        {receipt && (
          <div className="overflow-hidden">
            <ReceiptHighres receipt={receipt} />
          </div>
        )}

        <div className="tabs tabs-box">
          <input type="radio" name="form_layout" className="tab" aria-label="Simple" defaultChecked />
          <div className="tab-content bg-base-100 border-base-300 p-6">{renderSimpleForm()}</div>

          <input type="radio" name="form_layout" className="tab" aria-label="Advanced" />
          <div className="tab-content bg-base-100 border-base-300 p-6">{renderAdvancedForm()}</div>
        </div>

        <div className="bottom-24 fixed right-6 shadow-lg rounded-full">
          <button
            type="submit"
            className="btn btn-circle btn-primary"
            onClick={() => {
              navigate("/transactions/new");
            }}
          >
            <Save />
          </button>
        </div>
      </form>
      <div className="bottom-24 fixed right-20 shadow-lg rounded-full">
        <button
          className="btn btn-circle btn-primary"
          onClick={() => {
            // TODO: zoom in on the image
          }}
        >
          <ZoomIn />
        </button>
      </div>
    </>
  );
};

export default TransactionForm;
