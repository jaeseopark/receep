import { ReactNode } from "preact/compat";
import { useEffect, useState } from "preact/hooks";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppInfo } from "@/types";

import { axios } from "@/api";
import AppFrame from "@/components/AppFrame";
import ReceiptView from "@/components/ReceiptView";
import Home from "@/components/home";
import { Login, Signup } from "@/components/login";
import { Invite } from "@/components/login";

import "./app.scss";

const AUTHENTICATED_ROUTES: { [key: string]: () => ReactNode } = {
  "/": () => <Home />,
  "/invite": () => <Invite />,
  "/receipts": () => <ReceiptView />,
};

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
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login appInfo={appInfo} isAuthenticated={isAuthenticated} />} />
        <Route path="/signup" element={<Signup appInfo={appInfo} />} />
        {isAuthenticated && (
          <>
            {Object.entries(AUTHENTICATED_ROUTES).map(([path, Component]) => (
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
  );
};

export default App;
