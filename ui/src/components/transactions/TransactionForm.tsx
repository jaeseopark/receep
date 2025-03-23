import { Minus, Plus, Save, Trash } from "lucide-preact";
import DatePicker from "react-datepicker";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import CreatableSelect from "react-select/creatable";

import { Category, LineItem, Transaction, Vendor } from "@/types";

import { axios } from "@/api";
import { ReceiptHighres, ReceiptThumbnail } from "@/components/receipts/ReceiptImg";
import {
  sigCategories,
  sigReceipts,
  sigVendors,
  upsertCategories,
  upsertReceipts,
  upsertTransactions,
  upsertVendors,
} from "@/store";
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
  const { register, handleSubmit, control, setValue } = useForm<Transaction>({
    defaultValues: transaction,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "line_items",
  });

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
      .then((t: Transaction) => {
        upsertTransactions({ items: [t], toFront: true });
        if (t.receipt_id) {
          const receipt = sigReceipts.value.find(({ id }) => id === t.receipt_id);

          if (!receipt) {
            return;
          }

          const existingTransactionReference = receipt?.transactions.find(({ id }) => id === t.id);

          if (!existingTransactionReference) {
            receipt.transactions.push(t);
          }

          upsertReceipts({ items: [receipt] });
        } else {
          // TODO: clear transaction refenrece from the receipt object
        }
      })
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

  const renderReceipt = () => {
    const openModal = () => (document.getElementById("receipt-modal") as HTMLDialogElement).showModal();

    const closeModal = () => document.getElementById("receipt-modal-close")?.click();

    return (
      <Controller
        name="receipt_id"
        control={control}
        render={({ field: { value } }) => {
          const receiptIdExists = typeof value !== "undefined" && value;
          return (
            <>
              <div className="md:max-w-[50%] md:max-h-(--content-max-height)">
                {receiptIdExists && (
                  <div className="overflow-hidden">
                    <ReceiptHighres id={value} />
                  </div>
                )}
              </div>
              <div className="btn" onClick={openModal}>
                {receiptIdExists ? "Change/Remove receipt" : "Select receipt"}
              </div>
              <dialog id="receipt-modal" className="modal">
                <div className="modal-box">
                  <h3 className="font-bold text-lg">Select a receipt</h3>
                  {receiptIdExists && (
                    <li className="list-row">
                      <div
                        className="btn"
                        onClick={() => {
                          setValue("receipt_id", undefined);
                          closeModal();
                        }}
                      >
                        <Trash />
                      </div>
                    </li>
                  )}
                  <ul className="list bg-base-100 rounded-box shadow-md">
                    {sigReceipts.value.map((r) => {
                      return (
                        <li
                          key={r.id}
                          className="list-row"
                          onClick={() => {
                            setValue("receipt_id", r.id);
                            closeModal();
                          }}
                        >
                          <ReceiptThumbnail receipt={r} />
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <form method="dialog" className="modal-backdrop">
                  <button id="receipt-modal-close">close</button>
                </form>
              </dialog>
            </>
          );
        }}
      />
    );
  };

  const renderDateField = () => {
    return (
      <div className="flex">
        <span className="mr-2">Date:</span>
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
      <div className="fields md:min-w-[50%] mt-[1em]">
        {renderReceipt()}
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
