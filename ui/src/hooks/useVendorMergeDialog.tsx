import { useCallback, useMemo, useState } from "preact/hooks";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { Vendor } from "@/types";
import { axios } from "@/api";
import { ROUTE_PATHS } from "@/const";
import { removeVendor, sigVendors, sigTransactions, upsertTransactions } from "@/store";

interface UseVendorMergeDialogProps {
    vendor: Vendor;
}

const useVendorMergeDialog = ({ vendor }: UseVendorMergeDialogProps) => {
    const navigate = useNavigate();
    const [selectedTargetVendorId, setSelectedTargetVendorId] = useState<number | null>(null);

    const availableVendors = useMemo(() => {
        return sigVendors.value.filter(v => v.id !== vendor.id);
    }, [vendor.id]);

    const showDialog = useCallback(() => {
        const dialogElement = document.getElementById("merge-vendor-dialog") as HTMLDialogElement;
        if (dialogElement) {
            dialogElement.showModal();
        }
    }, []);

    const closeDialog = useCallback(() => {
        const dialogElement = document.getElementById("merge-vendor-dialog") as HTMLDialogElement;
        if (dialogElement) {
            dialogElement.close();
            setSelectedTargetVendorId(null);
        }
    }, []);

    const mergeVendors = useCallback(() => {
        if (!selectedTargetVendorId) {
            toast.error("Please select a target vendor.");
            return;
        }

        axios
            .post("/api/vendors/merge", {
                source_id: vendor.id,
                target_id: selectedTargetVendorId,
            }, {
                headers: {
                    "Content-Type": "application/json",
                },
            })
            .then(() => {
                // Update all transactions in memory to use the new vendor ID
                const updatedTransactions = sigTransactions.value.map(transaction => {
                    if (transaction.vendor_id === vendor.id) {
                        return { ...transaction, vendor_id: selectedTargetVendorId };
                    }
                    return transaction;
                });
                upsertTransactions({ items: updatedTransactions });

                // Remove the source vendor from the store
                removeVendor(vendor.id);
                
                toast.success("Vendors merged successfully.");
                navigate(ROUTE_PATHS.VENDORS);
            })
            .catch((error) => {
                toast.error(`Failed to merge vendors. ${error}`);
            });
    }, [vendor.id, selectedTargetVendorId, navigate]);

    const handleMergeConfirm = useCallback(() => {
        closeDialog();
        mergeVendors();
    }, [closeDialog, mergeVendors]);

    return {
        showDialog,
        dialog: (
            <dialog id="merge-vendor-dialog" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Merge Vendors</h3>
                    <div className="py-4 space-y-4">
                        <p>Select the target vendor to merge into. All transactions from "{vendor.name}" will be transferred to the selected vendor.</p>
                        <select
                            className="select select-bordered w-full"
                            onChange={(e) => setSelectedTargetVendorId(Number((e.target as HTMLSelectElement).value))}
                            value={selectedTargetVendorId || ""}
                        >
                            <option value="" disabled>Select target vendor</option>
                            {availableVendors.map((v) => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-4">
                        <button
                            className="btn btn-primary"
                            onClick={handleMergeConfirm}
                            disabled={!selectedTargetVendorId}
                        >
                            Merge
                        </button>
                        <button className="btn" onClick={closeDialog}>
                            Cancel
                        </button>
                    </div>
                </div>
            </dialog>
        ),
    };
};

export default useVendorMergeDialog;
