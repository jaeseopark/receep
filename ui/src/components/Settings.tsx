import { Dot } from "lucide-preact";
import { ReactNode } from "preact/compat";
import { useNavigate } from "react-router-dom";

import Me from "@/components/Me";

const Settings = ({ routes }: { routes: { path: string; name: string; description: string; icon?: ReactNode }[] }) => {
  const navigate = useNavigate();

  return (
    <div className="m-4">
      <Me />
      <ul className="list bg-base-100 rounded-box shadow-md">
        {routes.map(({ path, name, icon, description }) => {
          return (
            <li key={path} className="list-row">
              <div className="flex">
                {icon ?? <Dot />}
                <div>
                  <button onClick={() => navigate(path)}>
                    <span className="hover:underline">{name}</span>
                  </button>
                  <div className="text-xs">{description}</div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Settings;
