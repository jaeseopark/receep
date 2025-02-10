import { Filter, Plus } from "lucide-preact";

export const AddReceiptButton = ({ uploadReceipts }: { uploadReceipts: (files: File[]) => void }) => (
  <div className="bottom-24 fixed right-6 shadow-lg rounded-full">
    <input
      id="receipt-input"
      type="file"
      accept="image/*"
      className="hidden"
      multiple
      onChange={(e) => {
        const files: File[] = e?.target?.files || [];
        if (files.length > 0) {
          uploadReceipts([...files]);
        }
      }}
    />
    <button className="btn btn-circle btn-primary" onClick={() => document.getElementById("receipt-input")?.click()}>
      <Plus />
    </button>
  </div>
);

export const FilterButton = () => (
  <div className="bottom-24 fixed right-20 shadow-lg rounded-full">
    <button
      className="btn btn-circle btn-primary"
      onClick={() => {
        //@ts-ignore
        document.getElementById("receipt-filter-modal").showModal();
      }}
    >
      <Filter />
    </button>
  </div>
);
