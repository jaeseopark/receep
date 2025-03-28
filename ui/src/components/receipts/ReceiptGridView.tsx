import classNames from "classnames";
import { useCallback } from "preact/hooks";
import { useDropzone } from "react-dropzone";

import { Receipt } from "@/types";

import ReceiptFilterModal, { applySelectedFilters } from "@/components/receipts/ReceiptFilterModal";
import { AddReceiptButton, FilterButton } from "@/components/receipts/ReceiptGridActionsButtons";
import ReceiptCard from "@/components/receipts/ReceiptGridCard";
import { sigInitialLoadResult } from "@/gvars";
import { uploadReceipts } from "@/middleware/receipts";
import { sigReceipts } from "@/store";

import "@/components/receipts/ReceiptGridView.scss";

const SORT_DESCENDING = (a: Receipt, b: Receipt) => b.created_at - a.created_at;

const Receipts = ({ onClickOverride }: { onClickOverride?: () => void }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    uploadReceipts(acceptedFiles, (update) => {
      // TODO
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

  const renderGrid = () => {
    // TODO: use react-table to enable interactive sorting rather than manipulating the array directly.
    if (!sigReceipts.value.length) {
      return <div>No Receipts</div>;
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-4 p-4 overflow-hidden">
        {sigReceipts.value
          .filter(applySelectedFilters)
          .sort(SORT_DESCENDING)
          .map((r) => (
            <ReceiptCard key={r.id} receipt={r} onClickOverride={onClickOverride} />
          ))}
      </div>
    );
  };

  return (
    <div
      className={classNames("receipt-grid-view", {
        "bg-blue-100 active-drag": isDragActive,
      })}
      {...restDndRootProps}
    >
      <div className="dnd-instructions">Drop file(s) here</div>
      <input {...getInputProps()} />
      {renderGrid()}
      {!onClickOverride && (
        <>
          <AddReceiptButton />
          <FilterButton />
          <ReceiptFilterModal />
        </>
      )}
    </div>
  );
};

export default Receipts;
