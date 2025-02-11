import classNames from "classnames";
import { useCallback, useEffect, useState } from "preact/hooks";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";

import { Receipt } from "@/types";

import { axios } from "@/api";
import { AddReceiptButton, FilterButton } from "@/components/receipts/ActionButtons";
import ReceiptCard from "@/components/receipts/ReceiptCard";
import ReceiptFilterModal, { applySelectedFilters } from "@/components/receipts/ReceiptFilterModal";
import { sigInitialLoadResult } from "@/gvars";
import { removeReceipt, replaceReceipt, sigReceipts, upsertReceipts } from "@/store";
import { hash } from "@/utils/primitive";

const Receipts = () => {
  const uploadReceipts = (files: File[]): Promise<void>[] => {
    // Add blank receipts to display spinners while uploading
    upsertReceipts(
      files.map((file) => ({
        id: hash(file.name),
        user_id: 0,
        content_type: "",
        content_length: 0,
        content_hash: "",
        is_uploading: true,
        created_at: Date.now() / 1000,
        transactions: [],
      })),
    );

    return files.map((file): Promise<void> => {
      const formData = new FormData();
      formData.append("file", file, file.name);

      return axios
        .post(`/api/receipts`, formData, {
          headers: {
            Accept: "application/json",
          },
        })
        .then((r) => r.data)
        .then((receipt: Receipt) => {
          replaceReceipt(hash(file.name), receipt);
        })
        .catch((e) => {
          if (e?.response?.data?.code === "DUP_RECEIPT") {
            toast.error("The receipt already exists.");
          }
          removeReceipt(hash(file.name));
        });
    });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    Promise.allSettled(uploadReceipts(acceptedFiles)).then(() => {
      //TODO: toast
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  /* ---------------------------------------
   * End of hooks
   * --------------------------------------- */

  if (sigInitialLoadResult.value !== "SUCCEEDED") {
    return <div>Loading...</div>;
  }

  // The dnd zone is the whole component, and we don't want the onclick handler on that.
  // There is a separate upload button in the corner.
  const { onClick: _, ...restDndRootProps } = getRootProps();

  const renderReceipts = () => {
    // TODO: use react-table to enable interactive sorting rather than manipulating the array directly.
    if (!sigReceipts.value.length) {
      return <div>No Receipts</div>;
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-4 p-4 overflow-hidden">
        {sigReceipts.value.filter(applySelectedFilters).map(ReceiptCard)}
      </div>
    );
  };

  return (
    <div
      className={classNames("receipt-view", {
        "rounded-lg border bg-gray-100 border-gray-300": isDragActive,
      })}
      {...restDndRootProps}
    >
      <input {...getInputProps()} />
      {renderReceipts()}
      <AddReceiptButton uploadReceipts={uploadReceipts} />
      <FilterButton />
      <ReceiptFilterModal />
    </div>
  );
};

export default Receipts;
