import fuzzysort from "fuzzysort";
import { useMemo, useState } from "preact/hooks";
import Select from "react-select";
import toast from "react-hot-toast";

import { Transaction } from "@/types";

import { axios } from "@/api";
import { sigCategories, sigUserInfo, sigVendors, upsertTransactions } from "@/store";

const FUZZY_THRESHOLD = 0.7; // fuzzysort v3 scores are 0–1 (1 = perfect match)

const findBestMatchId = <T extends { id: number; name: string }>(
  targetName: string,
  candidates: T[],
): number | null => {
  const results = fuzzysort.go(targetName, candidates, { key: "name", limit: 1 });
  if (results.length === 0) return null;
  const best = results[0];
  return best.score >= FUZZY_THRESHOLD ? best.obj.id : null;
};

type Props = {
  transaction: Transaction;
  onClose: () => void;
  onSuccess: (newTransactionId: number) => void;
};

const CloneTransactionModal = ({ transaction, onClose, onSuccess }: Props) => {
  const myUserId = sigUserInfo.value?.user_id;

  const myVendors = useMemo(
    () => sigVendors.value.filter((v) => v.user_id === myUserId),
    [sigVendors.value, myUserId],
  );

  const myCategories = useMemo(
    () => sigCategories.value.filter((c) => c.user_id === myUserId),
    [sigCategories.value, myUserId],
  );

  const originalVendor = transaction.vendor_id
    ? sigVendors.value.find((v) => v.id === transaction.vendor_id)
    : null;

  const uniqueCategoryIds = useMemo(
    () => [...new Set(transaction.line_items.map((li) => li.category_id).filter(Boolean))],
    [],
  );

  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(() => {
    if (!originalVendor) return null;
    return findBestMatchId(originalVendor.name, myVendors);
  });

  const [categoryIdMap, setCategoryIdMap] = useState<Record<number, number | null>>(() => {
    const map: Record<number, number | null> = {};
    uniqueCategoryIds.forEach((catId) => {
      const originalCategory = sigCategories.value.find((c) => c.id === catId);
      map[catId] = originalCategory ? findBestMatchId(originalCategory.name, myCategories) : null;
    });
    return map;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const vendorOptions = useMemo(
    () => myVendors.map(({ id, name }) => ({ value: id, label: name })).sort((a, b) => a.label.localeCompare(b.label)),
    [myVendors],
  );

  const categoryOptions = useMemo(
    () =>
      myCategories
        .map(({ id, name }) => ({ value: id, label: name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [myCategories],
  );

  const handleConfirm = () => {
    setIsSubmitting(true);

    const clonedTransaction = {
      timestamp: transaction.timestamp,
      vendor_id: selectedVendorId ?? undefined,
      receipt_id: transaction.receipt_id ?? undefined,
      line_items: transaction.line_items.map((li) => ({
        name: li.name,
        amount_input: li.amount_input,
        amount: li.amount,
        notes: li.notes,
        category_id: categoryIdMap[li.category_id] ?? li.category_id,
      })),
    };

    axios
      .post("/api/transactions", clonedTransaction, {
        headers: { "Content-Type": "application/json" },
      })
      .then((r) => r.data)
      .then((t: Transaction) => {
        upsertTransactions({ items: [t], toFront: true });
        onSuccess(t.id);
      })
      .catch(() => {
        toast.error("Failed to clone transaction.");
        setIsSubmitting(false);
      });
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Clone Transaction</h3>
        <p className="text-sm text-gray-500 mb-4">
          Map the original vendor and categories to yours, then confirm to create your own copy.
        </p>

        {originalVendor && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-1">
              Vendor:{" "}
              <span className="font-mono text-gray-500">{originalVendor.name}</span>
            </div>
            <Select
              options={vendorOptions}
              value={vendorOptions.find((o) => o.value === selectedVendorId) ?? null}
              isClearable
              isSearchable
              placeholder="Select your vendor..."
              onChange={(opt) => setSelectedVendorId(opt?.value ?? null)}
            />
          </div>
        )}

        {uniqueCategoryIds.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Categories</div>
            {uniqueCategoryIds.map((catId) => {
              const originalCategory = sigCategories.value.find((c) => c.id === catId);
              return (
                <div key={catId} className="mb-3">
                  <div className="text-sm text-gray-500 mb-1">
                    {originalCategory?.name ?? `Category #${catId}`}
                  </div>
                  <Select
                    options={categoryOptions}
                    value={categoryOptions.find((o) => o.value === categoryIdMap[catId]) ?? null}
                    isClearable
                    isSearchable
                    placeholder="Select your category..."
                    onChange={(opt) =>
                      setCategoryIdMap((prev) => ({ ...prev, [catId]: opt?.value ?? null }))
                    }
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="modal-action">
          <button className="btn" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Cloning…" : "Clone"}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={!isSubmitting ? onClose : undefined} />
    </dialog>
  );
};

export default CloneTransactionModal;
