import { Hash } from "lucide-preact";
import { useEffect, useRef, useState } from "preact/hooks";

interface UseGoToOptions {
  onNavigate: (id: number) => void;
  popoverPositionClass: string;
}

export const useGoTo = ({ onNavigate, popoverPositionClass }: UseGoToOptions) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showGoTo, setShowGoTo] = useState(false);
  const [id, setId] = useState("");

  useEffect(() => {
    if (showGoTo) {
      setId("");
      inputRef.current?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowGoTo(false);
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [showGoTo]);

  const handleNavigate = () => {
    const parsed = parseInt(id, 10);
    if (parsed > 0) {
      onNavigate(parsed);
      setId("");
      setShowGoTo(false);
    }
  };

  const GoToPopover = showGoTo ? (
    <>
      <div className="fixed inset-0 z-10" onClick={() => setShowGoTo(false)} />
      <div className={`${popoverPositionClass} fixed z-20 flex items-center gap-2 bg-base-100 shadow-lg rounded-lg p-2`}>
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
          className="input input-bordered input-sm w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          onWheel={(e) => (e.target as HTMLInputElement).blur()}
        />
        <button className="btn btn-sm btn-primary" onClick={handleNavigate}>
          Go
        </button>
      </div>
    </>
  ) : null;

  const GoToToggleButton = (
    <button className="btn btn-circle btn-primary" onClick={() => setShowGoTo(!showGoTo)}>
      <Hash />
    </button>
  );

  return { GoToPopover, GoToToggleButton };
};
