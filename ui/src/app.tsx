import { useEffect, useState } from "preact/hooks";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppInfo } from "@/types";

import { axios } from "@/api";
import AppFrame from "@/components/AppFrame";
import Login from "@/components/Login";
import Signup from "@/components/Signup";

import { AUTHENTICATED_ROUTES } from "./routes";

import "./app.scss";

const App = () => {
  const [appInfo, setAppInfo] = useState<AppInfo>();
  const [attempted, setAttempted] = useState(false);
  const [isAuthenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    axios
      .get("/api/app/info")
      .then((r) => r.data)
      .then(setAppInfo);
    axios
      .get("/api/jwt/check")
      .then(() => {
        setAuthenticated(true);
        setAttempted(true);
      })
      .catch((error) => {
        console.error(error);
        setAttempted(true);
      });
  }, []);

  if (!attempted) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login appInfo={appInfo} isAuthenticated={isAuthenticated} />} />
          <Route path="/signup" element={<Signup appInfo={appInfo} />} />
          {isAuthenticated && (
            <>
              <Route path="/" element={<Navigate to="/receipts" replace />} />
              {AUTHENTICATED_ROUTES.map(({ path, component: Component }) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    <AppFrame>
                      <Component />
                    </AppFrame>
                  }
                />
              ))}
            </>
          )}
        </Routes>
      </BrowserRouter>
      <Toaster />
    </>
  );
};

export default App;
