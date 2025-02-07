import { axios } from "@/api";
import { Login, Signup } from "@/components/login";
import { useEffect, useState } from "preact/hooks";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "./app.css";

const Home = () => {
  return <div>Home</div>;
};

const AUTHENTICATED_ROUTES: { [key: string]: () => JSX.Element } = {
  "/": () => <Home />,
};

type AppInfo = {
  signup: "OPEN" | "CLOSED" | "INVITE_ONLY";
  totp_enabled: boolean;
  user_count: number;
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
        <Route path="/login" element={<Login appInfo={appInfo} />} />
        <Route path="/signup" element={<Signup />} />
        {isAuthenticated && (
          <>
            {Object.entries(AUTHENTICATED_ROUTES).map(([path, Component]) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
};

export default App;
