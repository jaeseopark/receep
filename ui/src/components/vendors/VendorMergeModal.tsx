import fuzzysort from "fuzzysort";
import { useCallback, useMemo, useState } from "preact/hooks";
import toast from "react-hot-toast";
import Select from "react-select";
import { useNavigate } from "react-router-dom";

import { axios } from "@/api";
import { ROUTE_PATHS } from "@/const";
import { removeVendor, sigTransactions, sigVendors, upsertTransactions } from "@/store";
import { Vendor } from "@/types";

const DIALOG_ID = "vendor-merge-modal";

const fuzzyFilterOption = (option: { label: string }, inputValue: string) => {
    if (!inputValue) return true;
    return fuzzysort.go(inputValue, [option.label], { limit: 1 }).length > 0;
};

const VendorMergeModal = ({ sourceVendor }: { sourceVendor: Vendor }) => {
    const navigate = useNavigate();
    const [targetId, setTargetId] = useState<number | null>(null);

    const otherVendors = sigVendors.value.filter((v) => v.id !== sourceVendor.id);

    const vendorOptions = useMemo(
        () => otherVendors.map(({ id, name }) => ({ value: id, label: name })).sort((a, b) => a.label.localeCompare(b.label)),
        [otherVendors],
    );

    const onConfirm = useCallback(() => {
        if (!targetId) return;

        axios
            .post(
                "/api/vendors/merge",
                { source_ids: [sourceVendor.id], target_id: targetId },
                { headers: { "Content-Type": "application/json" } },
            )
            .then(() => {
                const updated = sigTransactions.value
                    .filter((t) => t.vendor_id === sourceVendor.id)
                    .map((t) => ({ ...t, vendor_id: targetId }));
                if (updated.length > 0) {
                    upsertTransactions({ items: updated });
                }
                removeVendor(sourceVendor.id);
                toast.success("Vendors merged.");
                navigate(ROUTE_PATHS.VENDORS);
            })
            .catch((error) => {
                toast.error(`Failed to merge vendors. ${error}`);
            });
    }, [targetId, sourceVendor.id, navigate]);

    return (
        <dialog id={DIALOG_ID} className="modal">
            <div className="modal-box">
                <h3 className="font-bold text-lg">Merge Vendor</h3>
                <p className="py-2 text-sm">
                    All transactions from <strong>{sourceVendor.name}</strong> will be reassigned to the target vendor,
                    and <strong>{sourceVendor.name}</strong> will be deleted.
                </p>
                <div className="py-4">
                    <label className="block text-sm font-medium mb-1">Target Vendor</label>
                    <Select
                        options={vendorOptions}
                        value={vendorOptions.find((o) => o.value === targetId) ?? null}
                        isSearchable
                        placeholder="Select a vendor..."
                        onChange={(opt) => setTargetId(opt?.value ?? null)}
                        filterOption={fuzzyFilterOption}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                        styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                    />
                </div>
                <div className="flex gap-4">
                    <button className="btn btn-primary" disabled={!targetId} onClick={onConfirm}>
                        Merge
                    </button>
                    <button
                        className="btn"
                        onClick={() => (document.getElementById(DIALOG_ID) as HTMLDialogElement).close()}
                    >
                        Cancel
                    </button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    );
};

export const showVendorMergeModal = () =>
    (document.getElementById(DIALOG_ID) as HTMLDialogElement).showModal();

export default VendorMergeModal;
