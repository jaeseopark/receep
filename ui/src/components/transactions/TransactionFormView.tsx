import classNames from "classnames";
import { parse } from "date-fns";
import fuzzysort from "fuzzysort";
import { Minus, Plus, Save, Trash } from "lucide-preact";
import { KeyboardEvent } from "preact/compat";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import DatePicker from "react-datepicker";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import CreatableSelect from "react-select/creatable";

import { Category, Receipt, Transaction, UserInfo, Vendor } from "@/types";

import ReceiptDownloadButton from "@/components/receipts/ReceiptDownloadButton";
import { ReceiptHighres, ReceiptThumbnail } from "@/components/receipts/ReceiptImg";
import CloneTransactionModal from "@/components/transactions/CloneTransactionModal";
import { TZ_OFFSET_HRS } from "@/utils/dates";
import { createLineItem } from "@/utils/forms";
import { getVendorReportPath } from "@/utils/paths";
import { evaluateAmountInput } from "@/utils/primitive";

import "react-datepicker/dist/react-datepicker.css";

const DEFAULT_FIELD_ID = 0;

const fuzzyFilterOption = (option: { label: string }, inputValue: string) => {
  if (!inputValue) return true;
  return fuzzysort.go(inputValue, [option.label], { limit: 1 }).length > 0;
};

type FormData = Transaction & { enableAutoTax: boolean };

export type TransactionFormViewProps = {
  transaction: Transaction;
  vendors: Vendor[];
  categories: Category[];
  receipts: Receipt[];
  userInfo: UserInfo;
  /** Called with the raw form data when the user submits. The caller is responsible for any API calls. */
  onSave: (formData: FormData) => void;
  /** Called when the user confirms deletion. The caller is responsible for any API calls. */
  onDelete: () => void;
  /** Called after a successful clone so the caller can navigate to the new transaction. */
  onCloneSuccess: (newTransactionId: number) => void;
  /** Called when the user creates a new vendor inline. Should resolve to the new vendor's ID. */
  onCreateVendor: (name: string) => Promise<number>;
  /** Called when the user creates a new category inline. Should resolve to the new category's ID. */
  onCreateCategory: (name: string) => Promise<number>;
};

const TransactionFormView = ({
  transaction,
  vendors,
  categories,
  receipts,
  userInfo,
  onSave,
  onDelete,
  onCloneSuccess,
  onCreateVendor,
  onCreateCategory,
}: TransactionFormViewProps) => {
  const taxRateExistsInConfig = useMemo(() => (userInfo.config.tax_rate || 0) > 0, [userInfo]);
  const { register, handleSubmit, control, setValue, watch } = useForm<FormData>({
    defaultValues: { ...transaction, enableAutoTax: taxRateExistsInConfig },
  });
  const isNewTransaction = useMemo(() => transaction.id === -1, [transaction.id]);

  // Watch the first line item's category_id specifically
  const lineItems = watch("line_items");
  const firstLineItemCategoryId = watch("line_items.0.category_id");

  // Update auto-tax based on categories whenever the first line item's category or categories change
  useEffect(() => {
    if (!isNewTransaction || !taxRateExistsInConfig) {
      return;
    }

    let enableAutoTax = false;
    if (lineItems.length === 1 && firstLineItemCategoryId) {
      const category = categories.find((cat) => cat.id === firstLineItemCategoryId);
      enableAutoTax = Boolean(category?.with_autotax);
    }
    setValue("enableAutoTax", enableAutoTax);
  }, [isNewTransaction, taxRateExistsInConfig, lineItems, firstLineItemCategoryId, categories, setValue]);

  const categoryOptions = useMemo(
    () =>
      categories
        .map(({ name, id }) => ({
          label: name,
          value: id,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [categories],
  );

  const vendorOptions = useMemo(
    () =>
      vendors
        .map(({ name, id }) => ({
          label: name,
          value: id,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [vendors],
  );

  const {
    fields: lineItemFields,
    append: appendLineItem,
    remove: removeLineItem,
  } = useFieldArray({
    control,
    name: "line_items",
  });

  const isMyTransaction = useMemo(() => userInfo.user_id === transaction.user_id, [userInfo, transaction.user_id]);
  const [showCloneModal, setShowCloneModal] = useState(false);

  /* ----------------
   * End of hooks
   * ---------------- */

  const createVendor = (name: string) => {
    const vendor: Vendor = {
      id: DEFAULT_FIELD_ID,
      user_id: DEFAULT_FIELD_ID,
      name,
    };
    onCreateVendor(vendor.name)
      .then((id) => {
        setTimeout(() => setValue("vendor_id", id), 100);
      })
      .catch(() => {
        // TODO
      });
  };

  const createCategory = (fieldName: string, categoryName: string) => {
    onCreateCategory(categoryName)
      .then((id) => {
        setTimeout(() => {
          setValue(fieldName as any, id);
        }, 100);
      })
      .catch(() => {
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
          const linkedReceipt = receiptIdExists ? receipts.find((r) => r.id === receiptId) : undefined;
          return (
            <>
              {receiptIdExists && (
                <div className="max-h-(--content-max-height) overflow-x-hidden overflow-y-scroll">
                  <ReceiptHighres id={receiptId} />
                  {linkedReceipt && <ReceiptDownloadButton receipt={linkedReceipt} transaction={transaction} />}
                </div>
              )}
              {userInfo.config.advanced_mode && (
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
                    {receipts.map((r) => (
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
              className={classNames("rounded-lg p-2", { "bg-gray-100 text-gray-400 cursor-not-allowed": !isMyTransaction })}
              required
              disabled={!isMyTransaction}
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
        <div className={classNames("btn", { "btn-disabled": !isMyTransaction })} onClick={() => isMyTransaction && setValue("timestamp", Date.now() / 1000 + TZ_OFFSET_HRS * 3600)}>
          Today
        </div>
      </div>
    );
  };

  const renderVendorField = () => (
    <div className="flex flex-col gap-1">
      <Controller
        name="vendor_id"
        control={control}
        render={({ field: { value, onChange } }) => {
          let selectedOption;
          if (typeof value !== "undefined") {
            const match = vendorOptions.find(({ value: optionValue }) => optionValue === value);
            if (match) {
              selectedOption = match;
            } else {
              selectedOption = {
                label: "Select",
                value: -1,
              };
            }
          }

          const vendorId = selectedOption && selectedOption.value !== -1 ? selectedOption.value : null;

          return (
            <>
              <CreatableSelect
                options={vendorOptions}
                value={selectedOption}
                required
                isSearchable
                isClearable
                isDisabled={!isMyTransaction}
                placeholder="Select a vendor..."
                filterOption={fuzzyFilterOption}
                onCreateOption={createVendor}
                // @ts-ignore
                onChange={({ value }) => onChange(value)}
              />
              {vendorId !== null && isMyTransaction && (
                <a
                  className="btn btn-sm btn-outline"
                  href={getVendorReportPath(vendorId)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View vendor report
                </a>
              )}
            </>
          );
        }}
      />
    </div>
  );

  const renderLineItemHeader = () => (
    <div className="flex flex-row items-center gap-2">
      <h3 className="text-lg font-semibold">
        Line Items
        <button
          type="button"
          className="btn btn-circle btn-primary btn-sm scale-75"
          onClick={() => appendLineItem(createLineItem(transaction))}
          disabled={!isMyTransaction}
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
            disabled={!taxRateExistsInConfig || lineItems.length !== 1}
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
            disabled={!isMyTransaction || (ary.length === 1 && index === 0)}
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
                let selectedOption;
                if (typeof value !== "undefined") {
                  const match = categoryOptions.find(({ value: optionValue }) => optionValue === value);
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
                    options={categoryOptions}
                    value={selectedOption}
                    isSearchable
                    required
                    isClearable
                    isDisabled={!isMyTransaction}
                    placeholder="Select a category..."
                    filterOption={fuzzyFilterOption}
                    onCreateOption={(categoryName) => createCategory(fieldName, categoryName)}
                    // @ts-ignore
                    onChange={({ value }) => {
                      onChange(value);
                    }}
                  />
                );
              }}
            />
          </label>
          <div className="line-item-fields-row-1 flex gap-2">
            <input
              {...register(`line_items.${index}.name`)}
              className={classNames("mt-1 block w-full p-2 border rounded", { "bg-gray-100 text-gray-400 cursor-not-allowed": !isMyTransaction })}
              placeholder="(Optional) Description"
              disabled={!isMyTransaction}
            />
            <input
              {...register(`line_items.${index}.amount_input`)}
              required
              className={classNames("mt-1 block w-full p-2 border rounded w-[30%]", { "bg-gray-100 text-gray-400 cursor-not-allowed": !isMyTransaction })}
              placeholder="Amount"
              disabled={!isMyTransaction}
              onChange={({ target: { value } }: any) => {
                setValue(`line_items.${index}.amount_input`, value);
                setValue(
                  `line_items.${index}.amount`,
                  evaluateAmountInput(value, userInfo.config.currency_decimal_places),
                );
              }}
            />
          </div>
          <div
            className={classNames("line-item-fields-row-2", {
              hidden: !userInfo.config.advanced_mode,
            })}
          >
            <textarea
              {...register(`line_items.${index}.notes`)}
              className="mt-1 block w-full p-2 border rounded"
              placeholder="(Optional) notes"
              disabled={!isMyTransaction}
            ></textarea>
          </div>
        </div>
      </div>
    ));

    return <div className="flex flex-col gap-4">{children}</div>;
  };

  const handleDelete = useCallback(() => {
    onDelete();
  }, [onDelete]);

  return (
    <>
      {showCloneModal && (
        <CloneTransactionModal
          transaction={transaction}
          onClose={() => setShowCloneModal(false)}
          onSuccess={(newId) => {
            toast.success("Transaction cloned.");
            onCloneSuccess(newId);
          }}
        />
      )}
      <form className="flex justify-center" onSubmit={handleSubmit(onSave)}>
        <div className="field-columns mt-[1em] max-w-[48rem] lg:max-w-[64rem] flex flex-col md:flex-row gap-4">
          <div className="md:max-w-[24rem] lg:max-w-[40rem]">{renderReceipt()}</div>
          <div className="md:max-w-[24rem] md:flex-shrink-0 flex flex-col gap-4">
            {renderDateField()}
            {renderVendorField()}
            {renderLineItemHeader()}
            {renderLineItems()}
            {!isMyTransaction && (
              <div className="text-center text-sm text-gray-500 mb-2">
                <div>Edit is disabled because this transaction belongs to someone else.</div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline mt-2"
                  onClick={() => setShowCloneModal(true)}
                >
                  Clone as mine
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bottom-24 fixed right-6 shadow-lg rounded-full">
          <button type="submit" className="btn btn-circle btn-primary" disabled={!isMyTransaction}>
            <Save />
          </button>
        </div>
      </form>
      {!isNewTransaction && (
        <div className="bottom-24 fixed right-20 shadow-lg rounded-full">
          <button
            type="button"
            className="btn btn-circle bg-red-500 hover:bg-red-600 text-white"
            onClick={handleDelete}
            disabled={!isMyTransaction}
          >
            <Trash />
          </button>
        </div>
      )}
    </>
  );
};

export default TransactionFormView;
