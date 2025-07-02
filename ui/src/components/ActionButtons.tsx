import { ReactNode } from "preact/compat";

export type ActionButton = {
  name: string;
  containerClass?: string;
  buttonClass?: string;
  show: boolean;
  icon: ReactNode;
  onClick: () => void;
  sibling?: ReactNode;
};

const ActionButtons = ({ buttons }: { buttons: ActionButton[] }) => {
  const content = buttons
    .filter(({ show }) => show)
    .map(({ name, icon, containerClass, buttonClass, onClick: handleClick, sibling }, i) => {
      const rightOffset = 6 + 14 * i;
      return (
        <div key={name} className={`bottom-24 fixed right-${rightOffset} shadow-lg rounded-full ${containerClass}`}>
          {sibling}
          <button className={`btn btn-circle ${buttonClass}`} onClick={handleClick}>
            {icon}
          </button>
        </div>
      );
    });

  return <div>{content}</div>;
};

export default ActionButtons;
