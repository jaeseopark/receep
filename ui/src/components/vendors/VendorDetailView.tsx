import { useEffect, useState } from "preact/hooks";
import { toast } from "react-hot-toast";
import { useParams } from "react-router-dom";

import { Vendor } from "@/types";

import { sigInitialLoadResult } from "@/gvars";
import { sigVendors } from "@/store";
import { isPositiveInteger } from "@/utils/primitive";

import VendorForm from "@/components/vendors/VendorForm";

const VendorDetailView = () => {
    const { id } = useParams();
    const [vendor, setVendor] = useState<Vendor>();
    const [error, setError] = useState<string>();

    useEffect(() => {
        const init = () => {
            if (sigInitialLoadResult.value === "PENDING") {
                setTimeout(init, 100);
                return;
            }

            if (sigInitialLoadResult.value === "FAILED") {
                setError("Initial load failed");
                return;
            }

            if (id === "-1") {
                const newVendor: Vendor = {
                    id: -1,
                    user_id: -1,
                    name: "",
                };
                setVendor(newVendor);
                return;
            }

            if (!isPositiveInteger(id)) {
                toast.error(`The vendor id is not a valid integer. id='${id}'`);
                return;
            }

            const vendor = sigVendors.value.find((v) => v.id === Number.parseInt(id!));

            if (!vendor) {
                toast.error(`The requested vendor ID does not exist or does not belong to you. id='${id}'`);
                return;
            }

            setVendor(vendor);
        };

        setTimeout(init, 100);
    }, []);

    if (error) {
        return <div>{error}</div>;
    }

    if (!vendor) {
        return <div>Loading data...</div>;
    }

    const title = vendor.id === -1 ? "New Vendor" : "Edit Vendor";

    return (
        <div className="space-y-4 p-4 md:h-(--content-max-height)">
            <h2 className="text-xl font-bold justify-center">{title}</h2>
            <VendorForm vendor={vendor} />
        </div>
    );
};

export default VendorDetailView;
