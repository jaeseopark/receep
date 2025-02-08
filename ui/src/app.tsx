import { useEffect, useState } from "preact/hooks";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { axios } from "@/api";
import { Login, Signup } from "@/components/login";
import { Invite } from "@/components/login";
import { Center, VStack } from "@chakra-ui/react";

import "./app.scss";

type AppInfo = {
  signup: "OPEN" | "CLOSED" | "INVITE_ONLY";
  totp_enabled: boolean;
  user_count: number;
};

type UserInfo = {
  username: string;
  roles: string[];
};

const Home = () => {
  const [userInfo, setUserInfo] = useState<UserInfo>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    axios
      .get("/api/me")
      .then((r) => r.data)
      .then(setUserInfo)
      .catch((e) => setError(JSON.stringify(e.response.data)));
  }, []);

  if (!userInfo) {
    return <div>Loading...</div>;
  }

  const render = () => {
    if (error) {
      return <div>{error}</div>;
    }

    return (
      <>
        <div>
          Welcome, <span className="variable">{userInfo.username}</span>!
        </div>
        {userInfo.roles.length === 1 ? (
          <div>
            Your role is: <span className="variable">{userInfo.roles[0]}</span>.
          </div>
        ) : (
          <div>
            Your roles are: [
            {userInfo.roles.map((role) => (
              <span key={role} className="variable">
                {role}
              </span>
            ))}
            ].
          </div>
        )}
      </>
    );
  };

  return (
    <Center>
      <VStack>{render()}</VStack>
    </Center>
  );
};

const AUTHENTICATED_ROUTES: { [key: string]: () => JSX.Element } = {
  "/": () => <Home />,
  "/invite": () => <Invite />,
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
              <Route key={path} path={path} element={<Component />} />
            ))}
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
};

export default App;
