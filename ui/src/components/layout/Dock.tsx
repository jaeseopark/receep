import classNames from "classnames";
import { useLocation, useNavigate } from "react-router-dom";

import { AUTHENTICATED_ROUTES } from "@/routes";

const Dock = () => {
  const { pathname: currentPath } = useLocation();
  const navigate = useNavigate();

  return (
    <div className="dock dock-lg">
      {AUTHENTICATED_ROUTES.filter(({ type }) => type === "DOCKED").map(({ path, name, icon: icon }) => {
        const isSelected = path === "/" ? currentPath === "/" : currentPath.startsWith(path);

        return (
          <button
            key={name}
            className={classNames({
              "dock-active": isSelected,
            })}
            onClick={() => navigate(path)}
          >
            <div className="flex justify-center items-center scale-75 mb-[0em]" style={{ marginBottom: "-0.4em" }}>
              {icon}
            </div>
            <span className="text-sm" style={{}}>
              {name}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default Dock;
