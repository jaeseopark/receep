import fuzzysort from "fuzzysort";
import { ChartLine, Save, Trash } from "lucide-react";
import { useCallback, useMemo, useState } from "preact/hooks";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import Select from "react-select";
import { useNavigate } from "react-router-dom";

import { Vendor } from "@/types";

import { axios } from "@/api";
import { ROUTE_PATHS } from "@/const";
import useSimpleConfirmationDialog from "@/hooks/useSimpleConfirmationDialog";
import { removeVendor, sigTransactions, sigVendors, upsertTransactions, upsertVendors } from "@/store";
import { getVendorReportPath } from "@/utils/paths";

const fuzzyFilterOption = (option: { label: string }, inputValue: string) => {
    if (!inputValue) return true;
    return fuzzysort.go(inputValue, [option.label], { limit: 1 }).length > 0;
};

const VendorForm = ({ vendor }: { vendor: Vendor }) => {
    const navigate = useNavigate();
    const { register, handleSubmit } = useForm<Vendor>({
        defaultValues: vendor,
    });
    const [showMergeForm, setShowMergeForm] = useState(false);
    const [mergeTargetId, setMergeTargetId] = useState<number | null>(null);

    const isNewVendor = useMemo(() => {
        return vendor.id === -1;
    }, [vendor]);

    const vendorOptions = useMemo(
        () =>
            sigVendors.value
                .filter((v) => v.id !== vendor.id)
                .map(({ id, name }) => ({ value: id, label: name }))
                .sort((a, b) => a.label.localeCompare(b.label)),
        [vendor.id],
    );

    const onSubmit = useCallback((data: Vendor) => {
        let promise;
        if (isNewVendor) {
            promise = axios.post("/api/vendors", data, {
                headers: {
                    "Content-Type": "application/json",
                },
            });
        } else {
            promise = axios.put(`/api/vendors/${vendor.id}`, data, {
                headers: {
                    "Content-Type": "application/json",
                },
            });
        }

        promise
            .then((r) => r.data)
            .then((newVendor) => {
                upsertVendors({ items: [newVendor] });
            })
            .then(() => {
                toast.success("Vendor saved.");
                navigate(ROUTE_PATHS.VENDORS);
            });
    }, [isNewVendor, vendor.id, navigate]);

    const deleteVendor = useCallback(() => {
        axios
            .delete(`/api/vendors/${vendor.id}`, {
                headers: {
                    "Content-Type": "application/json",
                },
            })
            .then(() => {
                removeVendor(vendor.id);
                toast.success("Vendor deleted.");
                navigate(ROUTE_PATHS.VENDORS);
            })
            .catch((error) => {
                toast.error(`Failed to delete vendor. ${error}`);
            });
    }, [vendor.id, navigate]);

    const onMerge = useCallback(() => {
        if (!mergeTargetId) return;

        axios
            .post(
                "/api/vendors/merge",
                { source_ids: [vendor.id], target_id: mergeTargetId },
                { headers: { "Content-Type": "application/json" } },
            )
            .then(() => {
                const updated = sigTransactions.value
                    .filter((t) => t.vendor_id === vendor.id)
                    .map((t) => ({ ...t, vendor_id: mergeTargetId }));
                if (updated.length > 0) {
                    upsertTransactions({ items: updated });
                }
                removeVendor(vendor.id);
                toast.success("Vendors merged.");
                navigate(ROUTE_PATHS.VENDORS);
            })
            .catch((error) => {
                toast.error(`Failed to merge vendors. ${error}`);
            });
    }, [mergeTargetId, vendor.id, navigate]);

    const { show: showDeleteConfirmation, dialog: deleteConfirmationDialog } = useSimpleConfirmationDialog({
        dialogId: "delete-vendor",
        title: "Delete Vendor",
        question: "Are you sure you want to delete this vendor? This action cannot be undone.",
        choices: [
            {
                label: "Delete",
                onClick: deleteVendor,
                isPrimary: true,
            },
            {
                label: "Cancel",
                onClick: () => { },
            },
        ],
    });

    return (
        <div>
            {deleteConfirmationDialog}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Name</label>
                    <input
                        {...register("name", { required: true })}
                        type="text"
                        className="mt-1 block w-full p-2 border rounded"
                        placeholder="Vendor Name"
                    />
                </div>
                {!isNewVendor && (
                    <div>
                        <label className="block text-sm font-medium">Merge</label>
                        {!showMergeForm ? (
                            <button
                                type="button"
                                className="btn btn-sm mt-1"
                                onClick={() => setShowMergeForm(true)}
                            >
                                Merge into another vendor
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1">
                                    <Select
                                        options={vendorOptions}
                                        value={vendorOptions.find((o) => o.value === mergeTargetId) ?? null}
                                        isSearchable
                                        placeholder="Select a vendor..."
                                        onChange={(opt) => setMergeTargetId(opt?.value ?? null)}
                                        filterOption={fuzzyFilterOption}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    disabled={!mergeTargetId}
                                    onClick={onMerge}
                                >
                                    OK
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-sm"
                                    onClick={() => {
                                        setShowMergeForm(false);
                                        setMergeTargetId(null);
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                )}
                <div className="bottom-24 fixed right-6 shadow-lg rounded-full">
                    <button type="submit" className="btn btn-circle btn-primary">
                        <Save />
                    </button>
                </div>
            </form>
            {!isNewVendor && (
                <>
                    <div className="bottom-24 fixed right-20 shadow-lg rounded-full">
                        <button
                            type="button"
                            className="btn btn-circle bg-red-500 hover:bg-red-600 text-white"
                            onClick={showDeleteConfirmation}
                        >
                            <Trash />
                        </button>
                    </div>
                    <div className="bottom-24 fixed right-34 shadow-lg rounded-full">
                        <button
                            type="button"
                            className="btn btn-circle bg-blue-500 hover:bg-blue-600 text-white"
                            onClick={() => navigate(getVendorReportPath(vendor.id))}
                        >
                            <ChartLine />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default VendorForm;
