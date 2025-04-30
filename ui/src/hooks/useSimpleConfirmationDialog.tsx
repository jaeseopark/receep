import classNames from "classnames";

type Choice = {
  label: string;
  onClick: () => void;
  isPrimary?: boolean;
};

const useSimpleConfirmationDialog = ({
  dialogId,
  title,
  question,
  choices,
}: {
  title?: string;
  question?: string;
  dialogId: string;
  choices: Choice[];
}) => {
  const renderMessage = () => (
    <>
      {title && <h3 className="font-bold text-lg">{title}</h3>}
      {question && <p className="py-4">{question}</p>}
    </>
  );

  const dialog = (
    <dialog id={dialogId} className="modal">
      <div className="modal-box">
        {choices.length > 0 && renderMessage()}
        <form method="dialog">
          {choices.length === 0 && (
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          )}
          <div className="flex gap-4">
            {choices.map(({ label, onClick: handleClick, isPrimary }) => (
              <button
                key={label}
                className={classNames("btn", { "btn-primary": isPrimary })}
                type="button"
                onClick={() => {
                  (document.getElementById(dialogId) as HTMLDialogElement).close();
                  handleClick();
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </form>
        {choices.length === 0 && renderMessage()}
      </div>
    </dialog>
  );

  const show = () => (document.getElementById(dialogId) as HTMLDialogElement).showModal();

  return { dialog, show };
};

export default useSimpleConfirmationDialog;
