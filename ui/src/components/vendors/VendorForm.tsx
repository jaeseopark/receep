import { GitMerge, Save, Trash } from "lucide-react";
import { useCallback, useMemo } from "preact/hooks";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { Vendor } from "@/types";

import { axios } from "@/api";
import { ROUTE_PATHS } from "@/const";
import useSimpleConfirmationDialog from "@/hooks/useSimpleConfirmationDialog";
import { removeVendor, upsertVendors } from "@/store";

const VendorForm = ({ vendor }: { vendor: Vendor }) => {
    const navigate = useNavigate();
    const { register, handleSubmit } = useForm<Vendor>({
        defaultValues: vendor,
    });

    const isNewVendor = useMemo(() => {
        return vendor.id === -1;
    }, [vendor]);

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
                            className="btn btn-circle bg-gray-500 hover:bg-gray-600 text-white"
                            onClick={() => {
                                // TODO: Handle merge action
                                console.log("Merge vendors");
                            }}
                        >
                            <GitMerge />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default VendorForm;
