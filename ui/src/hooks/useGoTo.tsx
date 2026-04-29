import { Hash } from "lucide-preact";
import { useRef, useState } from "preact/hooks";

interface UseGoToOptions {
  onNavigate: (id: number) => void;
}

export const useGoTo = ({ onNavigate }: UseGoToOptions) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [id, setId] = useState("");

  const openDialog = () => {
    setId("");
    dialogRef.current?.showModal();
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleNavigate = () => {
    const parsed = parseInt(id, 10);
    if (parsed > 0) {
      onNavigate(parsed);
      dialogRef.current?.close();
    }
  };

  const GoToModal = (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box flex items-center gap-2 w-auto min-w-0 p-4">
        <input
          ref={inputRef}
          type="number"
          min="1"
          value={id}
          onChange={(e) => setId((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === "." || e.key === "e" || e.key === "E") e.preventDefault();
            if (e.key === "Enter") handleNavigate();
          }}
          placeholder="ID"
          className="input input-bordered input-sm w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          onWheel={(e) => (e.target as HTMLInputElement).blur()}
        />
        <button className="btn btn-sm btn-primary" onClick={handleNavigate}>
          Go
        </button>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );

  const GoToToggleButton = (
    <button className="btn btn-circle btn-primary" onClick={openDialog}>
      <Hash />
    </button>
  );

  return { GoToModal, GoToToggleButton };
};
