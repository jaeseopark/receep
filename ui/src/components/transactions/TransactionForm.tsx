import { parse } from "date-fns";
import { Minus, Plus, Save, Trash } from "lucide-preact";
import { KeyboardEvent } from "preact/compat";
import { useCallback, useMemo } from "preact/hooks";
import DatePicker from "react-datepicker";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import CreatableSelect from "react-select/creatable";

import { Category, Transaction, Vendor } from "@/types";

import { axios } from "@/api";
import { ReceiptHighres, ReceiptThumbnail } from "@/components/receipts/ReceiptImg";
import useAutoTax from "@/hooks/useAutoTax";
import {
  sigCategories,
  sigReceipts,
  sigUserInfo,
  sigVendors,
  upsertCategories,
  upsertReceipts,
  upsertTransactions,
  upsertVendors,
} from "@/store";
import { createLineItem } from "@/utils/forms";
import { evaluateAmountInput } from "@/utils/primitive";

import "react-datepicker/dist/react-datepicker.css";

const DEFAULT_FIELD_ID = 0;

const TZ_OFFSET_HRS = -new Date().getTimezoneOffset() / 60;

type FormData = Transaction & { enableAutoTax: boolean };

const TransactionForm = ({ transaction }: { transaction: Transaction }) => {
  const navigate = useNavigate();
  const { register, handleSubmit, control, setValue } = useForm<FormData>({
    defaultValues: { ...transaction, enableAutoTax: true },
  });
  const { applyAutoTax } = useAutoTax();
  const isNewTransaction = useMemo(() => transaction.id === -1, [transaction.id]);

  const {
    fields: lineItemFields,
    append: appendLineItem,
    remove: removeLineItem,
  } = useFieldArray({
    control,
    name: "line_items",
  });

  const upsertTransaction = useCallback((formData: FormData) => {
    const { enableAutoTax, ...t } = formData;
    let apiPromise;

    if (isNewTransaction) {
      // ID is -1, meaning this is a brand new transaction.

      if (enableAutoTax) {
        applyAutoTax(formData);
      }

      apiPromise = axios.post("/api/transactions", formData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    } else {
      apiPromise = axios.put(`/api/transactions/${t.id}`, formData, {
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
  }, []);

  /* ----------------
   * End of hooks
   * ---------------- */

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
        render={({ field: { value: receiptId } }) => {
          const receiptIdExists = typeof receiptId !== "undefined" && receiptId !== null;
          return (
            <>
              {receiptIdExists && (
                <div className="md:max-w-[50%] md:max-h-(--content-max-height) overflow-hidden">
                  <ReceiptHighres id={receiptId} />
                </div>
              )}
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
                          setValue("receipt_id", null as any);
                          closeModal();
                        }}
                      >
                        <Trash />
                      </div>
                    </li>
                  )}
                  <ul className="list bg-base-100 rounded-box shadow-md">
                    {sigReceipts.value.map((r) => (
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
                    ))}
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
              selected={new Date((value - TZ_OFFSET_HRS * 3600) * 1000)}
              onChange={(date) => {
                if (date) {
                  const newValue = date?.getTime() / 1000 + TZ_OFFSET_HRS * 3600;
                  onChange(newValue);
                } else {
                  // TODO error handling
                }
              }}
              onChangeRaw={(date: KeyboardEvent<HTMLInputElement>) => {
                const newValue = parse(date.currentTarget.value, "yyyy-MM-dd", new Date());
                if (newValue instanceof Date) {
                  onChange(newValue.getTime() / 1000 + TZ_OFFSET_HRS * 3600);
                }
              }}
            />
          )}
        />
        <div className="btn" onClick={() => setValue("timestamp", Date.now() / 1000 + TZ_OFFSET_HRS * 3600)}>
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
    <div>
      <h3 className="text-lg font-semibold">
        Line Items
        <button
          type="button"
          className="btn btn-circle btn-primary btn-sm scale-75"
          onClick={() => appendLineItem(createLineItem(transaction))}
        >
          <Plus />
        </button>
      </h3>
      {isNewTransaction && (
        <div className="mt-2">
          <label className="flex items-center space-x-2">
            <input type="checkbox" {...register("enableAutoTax")} className="checkbox" />
            <span>Enable Auto Tax</span>
          </label>
        </div>
      )}
    </div>
  );

  const renderLineItems = () =>
    lineItemFields.map((item, index, ary) => (
      <div key={item.id} className="flex">
        <div>
          <button
            type="button"
            className="btn btn-circle btn-red btn-sm scale-75"
            onClick={() => removeLineItem(index)}
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
                setValue(
                  `line_items.${index}.amount`,
                  evaluateAmountInput(value, sigUserInfo.value!.config.currency_decimal_places),
                );
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
