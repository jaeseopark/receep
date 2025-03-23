import { Minus, Plus, Save } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import DatePicker from "react-datepicker";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import CreatableSelect from "react-select/creatable";

import { Category, LineItem, Receipt, Transaction, Vendor } from "@/types";

import { axios } from "@/api";
import { ReceiptHighres } from "@/components/receipts/ReceiptImg";
import { sigCategories, sigReceipts, sigVendors, upsertCategories, upsertTransactions, upsertVendors } from "@/store";
import { evaluateAmountInput } from "@/utils/primitive";

import "react-datepicker/dist/react-datepicker.css";

const DEFAULT_FIELD_ID = 0;

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
  const { register, handleSubmit, control, watch, setValue } = useForm<Transaction>({
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
      id: DEFAULT_FIELD_ID,
      user_id: DEFAULT_FIELD_ID,
      name,
    };

    axios
      .post("/api/vendors", newVendor, {})
      .then((r) => r.data)
      .then((returnedVenor) => {
        upsertVendors({ items: [returnedVenor] });
        setTimeout(() => setValue("vendor_id", returnedVenor.id), 100);
        // TODO: backpopuplate receipts
      })
      .catch((e) => {
        // TODO
      });
  };

  const createCategory = (fieldName, categoryName: string) => {
    const category: Category = {
      id: DEFAULT_FIELD_ID,
      user_id: DEFAULT_FIELD_ID,
      name: categoryName,
      description: "Auto-Generated from a transaction",
    };

    axios
      .post("/api/categories", category)
      .then((r) => r.data)
      .then((returnedCategory: Category) => {
        upsertCategories({ items: [returnedCategory] });
        setTimeout(() => setValue(fieldName, returnedCategory.id), 100);
      })
      .catch((e) => {
        // TODO
      });
  };

  /* ----------------
   * End of event handlers
   * ---------------- */

  const renderDateField = () => {
    return (
      <div>
        Transaction Date:{" "}
        <Controller
          name="timestamp"
          control={control}
          render={({ field: { value, onChange } }) => (
            <DatePicker
              dateFormat="YYYY-MM-dd"
              selected={new Date(value * 1000)}
              onChange={(date) => {
                if (date) {
                  const newValue = date?.getTime() / 1000;
                  onChange(newValue);
                } else {
                  // TODO error handling
                }
              }}
            />
          )}
        />
        <div className="btn" onClick={() => setValue("timestamp", Date.now() / 1000)}>
          Today
        </div>
      </div>
    );
  };

  const renderVendorField = () => (
    <label className="block">
      <Controller
        name="vendor_id"
        control={control}
        render={({ field: { value, onChange } }) => {
          const options = sigVendors.value.map(({ name, id }) => ({
            label: name,
            value: id,
          }));
          let selectedOption;
          if (typeof value !== "undefined") {
            const match = options.find(({ value: optionValue }) => optionValue === value);
            if (match) {
              selectedOption = match;
            } else {
              selectedOption = {
                label: "Select",
                value: -1,
              };
            }
          }

          return (
            <CreatableSelect
              options={options}
              value={selectedOption}
              isSearchable
              isClearable
              placeholder="Select a vendor..."
              onCreateOption={createVendor}
              // @ts-ignore
              onChange={({ value }) => onChange(value)}
            />
          );
        }}
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
              onChange={({ target: { value } }: any) => {
                setValue(`line_items.${index}.amount`, evaluateAmountInput(value));
              }}
            />
          </div>
          <label className="block">
            <Controller
              name={`line_items.${index}.category_id`}
              control={control}
              render={({ field: { name: fieldName, value, onChange } }) => {
                const options = sigCategories.value.map(({ name, id }) => ({
                  label: name,
                  value: id,
                }));
                let selectedOption;
                if (typeof value !== "undefined") {
                  const match = options.find(({ value: optionValue }) => optionValue === value);
                  if (match) {
                    selectedOption = match;
                  } else {
                    selectedOption = {
                      label: "Select",
                      value: -1,
                    };
                  }
                }

                return (
                  <CreatableSelect
                    options={options}
                    value={selectedOption}
                    isSearchable
                    isClearable
                    placeholder="Select a category..."
                    onCreateOption={(categoryName) => createCategory(fieldName, categoryName)}
                    // @ts-ignore
                    onChange={({ value }) => onChange(value)}
                  />
                );
              }}
            />
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
        {renderDateField()}
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
