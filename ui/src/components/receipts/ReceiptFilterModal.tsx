import { signal } from "@preact/signals";

import { Receipt } from "@/types";

import { sigUserInfo } from "@/store";

type ReceiptFilter = {
  name: string;
  tooltip: string;
  predicate: (r: Receipt) => boolean;
  isSelected?: boolean;
};

const sigReceiptFilters = signal<ReceiptFilter[]>([
  {
    name: "Show my receipts only",
    tooltip: "Hides the receipt uploaded by other users.",
    predicate: (r) => r.user_id === sigUserInfo.value?.user_id,
    isSelected: true,
  },
  {
    name: "Show unvetted receipts only",
    tooltip: "Hides the receipts that have not been associated with any transactions.",
    predicate: (r) => r.transactions.length === 0,
    isSelected: true,
  },
]);

// TODO: ability to reset filter selections

export const applySelectedFilters = (r: Receipt): boolean =>
  sigReceiptFilters.value.filter((f) => f.isSelected).reduce((acc, { predicate }) => acc && predicate(r), true);

const ReceiptFilterModal = () => {
  return (
    <dialog id="receipt-filter-modal" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Filters</h3>
        <table>
          <tbody>
            {sigReceiptFilters.value.map((filter) => {
              const { name, tooltip, isSelected } = filter;
              return (
                <label key={name} className="flex items-center gap-2 cursor-pointer tooltip" data-tip={tooltip}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => (filter.isSelected = !isSelected)}
                    className="checkbox checkbox-primary"
                  />
                  <span className="text-sm capitalize">{name}</span>
                </label>
              );
            })}
          </tbody>
        </table>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
};

export default ReceiptFilterModal;
