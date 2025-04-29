import { signal } from "@preact/signals";
import { Info } from "lucide-preact";

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
    tooltip: "Hides receipt uploaded by other users.",
    predicate: (r) => r.user_id === sigUserInfo.value?.user_id,
    isSelected: true,
  },
  {
    name: "Hide Vetted Receipts",
    tooltip: "Hides receipts that have associated transactions.",
    predicate(r) {
      const hasTransaction = r.transactions && r.transactions.length > 0;
      return !hasTransaction;
    },
    isSelected: false,
  },
]);

// TODO: ability to reset filter selections
// TODO: date range

export const applySelectedFilters = (r: Receipt): boolean =>
  sigReceiptFilters.value.filter((f) => f.isSelected).reduce((acc, { predicate }) => acc && predicate(r), true);

const ReceiptFilterModal = () => {
  return (
    <dialog id="receipt-filter-modal" className="modal">
      <div className="modal-box overflow-hidden">
        <h3 className="font-bold text-lg">Filters</h3>
        <table>
          <tbody>
            {sigReceiptFilters.value.map((filter) => {
              const { name, tooltip, isSelected } = filter;
              return (
                <label key={name} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      sigReceiptFilters.value = sigReceiptFilters.value.reduce((acc, next) => {
                        if (next.name === name) {
                          acc.push({
                            ...next,
                            isSelected: !isSelected,
                          });
                        } else {
                          acc.push(next);
                        }
                        return acc;
                      }, [] as ReceiptFilter[]);
                    }}
                    className="checkbox checkbox-primary"
                  />
                  <span className="text-sm capitalize">{name}</span>
                  <div className="tooltip" data-tip={tooltip}>
                    <Info />
                  </div>
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
