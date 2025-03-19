import { Minus, Plus, Save } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";

import { LineItem, Receipt, Transaction, Vendor } from "@/types";

import { axios } from "@/api";
import { ReceiptHighres } from "@/components/receipts/ReceiptImg";
import { sigCategories, sigReceipts, sigVendors, upsertTransactions, upsertVendors } from "@/store";
import { evaluateAmountInput } from "@/utils/primitive";

const DEFAULT_NEW_VENDOR_ID = 0;
const DEFAULT_NEW_VENDOR_USER_ID = 0;

const createLineItem = (transaction: Transaction): LineItem => ({
  id: Date.now(),
  name: "",
  transaction_id: transaction.id!,
  amount_input: "",
  amount: 0,
  category_id: 0,
});

const TransactionForm = ({ transaction }: { transaction: Transaction }) => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    getValues,
    setValue,
  } = useForm<Transaction>({
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
  }, [receiptId, sigReceipts.value]);

  /* ----------------
   * End of hooks
   * ---------------- */

  const upsertTransaction = (submittedTransaction: Transaction) => {
    const { id } = submittedTransaction;
    let apiPromise;

    if (submittedTransaction.id === -1) {
      // ID is -1, meaning this is a brand new transaction.
      apiPromise = axios.post("/api/transactions", submittedTransaction, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    } else {
      apiPromise = axios.put(`/api/transactions/${id}`, submittedTransaction, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    apiPromise
      .then((r) => r.data)
      .then((t) => upsertTransactions({ items: [t], toFront: true }))
      .then(() => {
        toast.success("Transaction saved.");
        navigate("/transactions");
      })
      .catch((e) => {
        // TODO
      });
  };

  const createVendor = (name: string) => {
    const newVendor: Vendor = {
      id: DEFAULT_NEW_VENDOR_ID,
      user_id: DEFAULT_NEW_VENDOR_USER_ID,
      name,
    };

    axios
      .post("/api/vendors", newVendor, {})
      .then((r) => r.data)
      .then((returnedVenor) => {
        upsertVendors([returnedVenor]);
        setTimeout(() => setValue("vendor_id", returnedVenor.id), 100);
        // TODO: backpopuplate receipts
      })
      .catch((e) => {
        // TODO
      });
  };

  /* ----------------
   * End of event handlers
   * ---------------- */

  const renderVendorField = () => (
    <label className="block">
      <CreatableSelect
        {...register("vendor_id")}
        options={sigVendors.value.map(({ id: value, name: label }) => ({
          value,
          label,
        }))}
        isSearchable
        placeholder="Select a vendor..."
        onCreateOption={createVendor}
        onChange={(selectedItem) => setValue("vendor_id", selectedItem?.value)}
      />
    </label>
  );

  const renderLineItemHeader = () => (
    <h3 className="text-lg font-semibold">
      Line Items
      <button
        type="button"
        className="btn btn-circle btn-primary btn-sm scale-75"
        onClick={() => append(createLineItem(transaction))}
      >
        <Plus />
      </button>
    </h3>
  );

  const renderLineItems = () =>
    fields.map((item, index, ary) => (
      <div key={item.id} className="flex">
        <div>
          <button
            type="button"
            className="btn btn-circle btn-red btn-sm scale-75"
            onClick={() => remove(index)}
            disabled={ary.length === 1 && index === 0}
          >
            <Minus />
          </button>
        </div>
        <div className="line-item-fields">
          <div className="line-item-fields-row-1 flex">
            <input
              {...register(`line_items.${index}.name`)}
              className="mt-1 block w-full p-2 border rounded"
              placeholder="Item description"
            />
            <input
              {...register(`line_items.${index}.amount_input`)}
              className="mt-1 block w-full p-2 border rounded w-[30%]"
              placeholder="Amount"
              onChange={({ target: { value } }) => {
                setValue(`line_items.${index}.amount`, evaluateAmountInput(value));
              }}
            />
          </div>
          <label className="block">
            <Select
              options={sigCategories.value.map(({ name, id }) => ({
                label: name,
                value: id,
              }))}
              isSearchable
              onChange={(selectedOption) => setValue(`line_items.${index}.category_id`, selectedOption?.value!)}
            />
            <input type="number" {...register(`line_items.${index}.category_id`)} className="invisible" />
          </label>
          <div className="line-item-fields-row-2">
            <textarea
              {...register(`line_items.${index}.notes`)}
              className="mt-1 block w-full p-2 border rounded"
              placeholder="(Optional) notes"
            ></textarea>
          </div>
        </div>
      </div>
    ));

  return (
    <form onSubmit={handleSubmit(upsertTransaction)} className="md:flex">
      <div className="md:max-w-[50%] md:max-h-(--content-max-height)">
        {receipt && (
          <div className="overflow-hidden">
            <ReceiptHighres receipt={receipt} />
          </div>
        )}
      </div>

      <div className="fields md:min-w-[50%] mt-[1em]">
        {renderVendorField()}
        {renderLineItemHeader()}
        {renderLineItems()}
      </div>

      <div className="bottom-24 fixed right-6 shadow-lg rounded-full">
        <button type="submit" className="btn btn-circle btn-primary">
          <Save />
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;
