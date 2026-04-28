import { useState } from "preact/hooks";
import { ReactNode } from "preact/compat";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import Me from "@/components/user/Me";
import { refreshAllData, sigInitialLoadResult } from "@/gvars";

const Settings = ({ routes }: { routes: { path: string; name: string; description: string; icon?: ReactNode }[] }) => {
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    refreshAllData();
    toast.promise(
      new Promise<void>((resolve, reject) => {
        const interval = setInterval(() => {
          if (sigInitialLoadResult.value === "SUCCEEDED") {
            clearInterval(interval);
            setRefreshing(false);
            resolve();
          } else if (sigInitialLoadResult.value === "FAILED") {
            clearInterval(interval);
            setRefreshing(false);
            reject();
          }
        }, 100);
      }),
      { loading: "Refreshing...", success: "Data refreshed", error: "Refresh failed" },
    );
  };

  return (
    <div className="m-4">
      <Me />
      <div className="flex justify-end mb-2">
        <button className="btn btn-sm" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? <span className="loading loading-spinner loading-xs" /> : null}
          Refresh Data
        </button>
      </div>
      <ul className="list bg-base-100 rounded-box shadow-md">
        {routes
          .filter(({ icon }) => icon)
          .map(({ path, name, icon, description }) => {
            return (
              <li key={path} className="list-row">
                <div className="flex">
                  {icon}
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
