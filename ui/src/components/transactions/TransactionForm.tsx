import classNames from "classnames";
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
import { TZ_OFFSET_HRS } from "@/utils/dates";
import { createLineItem } from "@/utils/forms";
import { evaluateAmountInput } from "@/utils/primitive";

import "react-datepicker/dist/react-datepicker.css";

const DEFAULT_FIELD_ID = 0;

type FormData = Transaction & { enableAutoTax: boolean };

const TransactionForm = ({ transaction }: { transaction: Transaction }) => {
  const navigate = useNavigate();
  const taxRateExistsInConfig = useMemo(() => (sigUserInfo.value?.config.tax_rate || 0) > 0, []);
  const { register, handleSubmit, control, setValue } = useForm<FormData>({
    defaultValues: { ...transaction, enableAutoTax: taxRateExistsInConfig },
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

  const isMyTransaction = useMemo(() => sigUserInfo.value?.user_id === transaction.user_id, [sigUserInfo.value]);

  const upsertTransaction = useCallback(
    (formData: FormData) => {
      if (!isMyTransaction) {
        return;
      }

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
          navigate(ROUTE_PATHS.TRANSACTIONS);
        })
        .catch((e) => {
          // TODO
        });
    },
    [isMyTransaction, isNewTransaction],
  );

  const deleteTransaction = useCallback(() => {
    axios
      .delete(`/api/transactions/${transaction.id}`, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      .then(() => {
        removeTransaction(transaction.id);
        toast.success("Transaction deleted.");
        navigate(ROUTE_PATHS.TRANSACTIONS);
      });
  }, []);

  const { show: showDeleteConfirmation, dialog: deleteConfirmationDialog } = useSimpleConfirmationDialog({
    dialogId: "delete-transaction",
    title: "Delete Transaction",
    question: "Are you sure you want to delete this transaction? This action cannot be undone.",
    choices: [
      {
        label: "Delete",
        onClick: deleteTransaction,
        isPrimary: true,
      },
      {
        label: "Cancel",
        onClick: () => {},
      },
    ],
  });

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
                <div className="max-h-(--content-max-height) overflow-hidden">
                  <ReceiptHighres id={receiptId} />
                </div>
              )}
              {sigUserInfo.value?.config.advanced_mode && (
                <div className="btn" onClick={openModal}>
                  {receiptIdExists ? "Change/Remove receipt" : "Select receipt"}
                </div>
              )}
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
      <div className="flex gap-4 items-center">
        <span className="mr-2">Date:</span>
        <Controller
          name="timestamp"
          control={control}
          render={({ field: { value, onChange } }) => (
            <DatePicker
              className="rounded-lg p-2"
              required
              dateFormat="yyyy-MM-dd"
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
                try {
                  const newValue = parse(date.currentTarget.value, "yyyy-MM-dd", new Date());
                  if (newValue instanceof Date) {
                    onChange(newValue.getTime() / 1000 + TZ_OFFSET_HRS * 3600);
                  }
                } catch (error) {
                  // TODO
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
          const options = sigVendors.value
            .map(({ name, id }) => ({
              label: name,
              value: id,
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
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
              required
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
    <div className="flex flex-row items-center gap-2">
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
      <div className={classNames("auto-tax-container", { hidden: !isNewTransaction })}>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            {...register("enableAutoTax")}
            className="checkbox"
            disabled={!taxRateExistsInConfig}
          />
          <span>Enable Auto Tax</span>
        </label>
      </div>
    </div>
  );

  const renderLineItems = () => {
    const children = lineItemFields.map((item, index, ary) => (
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
                    required
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
          <div className="line-item-fields-row-1 flex gap-2">
            <input
              {...register(`line_items.${index}.name`)}
              className="mt-1 block w-full p-2 border rounded"
              placeholder="(Optional) Description"
            />
            <input
              {...register(`line_items.${index}.amount_input`)}
              required
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
          <div
            className={classNames("line-item-fields-row-2", {
              hidden: !sigUserInfo.value?.config.advanced_mode,
            })}
          >
            <textarea
              {...register(`line_items.${index}.notes`)}
              className="mt-1 block w-full p-2 border rounded"
              placeholder="(Optional) notes"
            ></textarea>
          </div>
        </div>
      </div>
    ));

    return <div className="flex flex-col gap-4">{children}</div>;
  };

  return (
    <>
      <form className="flex justify-center" onSubmit={handleSubmit(upsertTransaction)}>
        <div className="field-columns mt-[1em] max-w-[1024px] flex flex-col md:flex-row gap-4">
          <div className="field-column w-full">{renderReceipt()}</div>
          <div className="field-column md:max-w-[450px] md:flex-shrink-0 flex flex-col gap-4">
            {renderDateField()}
            {renderVendorField()}
            {renderLineItemHeader()}
            {renderLineItems()}
          </div>
        </div>

        <div className="bottom-24 fixed right-6 shadow-lg rounded-full">
          <button type="submit" className="btn btn-circle btn-primary" disabled={!isMyTransaction}>
            <Save />
          </button>
        </div>
      </form>
      <div className="bottom-24 fixed right-20 shadow-lg rounded-full">
        <button
          type="button"
          className="btn btn-circle bg-red-500 hover:bg-red-600 text-white"
          onClick={showDeleteConfirmation}
          disabled={!isMyTransaction}
        >
          <Trash />
        </button>
      </div>
      {deleteConfirmationDialog}
    </>
  );
};

export default TransactionForm;
