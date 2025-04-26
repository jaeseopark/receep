import { useEffect, useState } from "preact/hooks";
import { useNavigate } from "react-router-dom";

import { AppInfo } from "@/types";

import { axios, setJwt } from "@/api";

const CredentialForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    totp: "",
  });
  const [mode, setMode] = useState<"INITIAL_LOGIN" | "2FA">("INITIAL_LOGIN");
  const [error, setError] = useState("");

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [event?.target?.name]: event?.target?.value! });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    axios
      .post("/api/login", formData, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      .then((r) => r.data)
      .then(({ token }) => {
        if (token) {
          setJwt(token);
          onSuccess();
          return;
        }

        // Need to proceed to 2FA.
        setError("");
        setMode("2FA");
      })
      .catch((e) => {
        if (e.response && e.response.status === 401) {
          setError("Incorrect credentials");
        } else {
          setError(JSON.stringify(e.response.data));
        }
      });
  };

  const shouldDisableButton = (() => {
    if (mode === "INITIAL_LOGIN" && (!formData.username || !formData.password)) {
      return true;
    }

    if (mode === "2FA" && (!formData.totp || formData.totp.length !== 6)) {
      return true;
    }

    return false;
  })();

  return (
    <div className="card">
      <div className="card-body">
        <div className="card-title">Login</div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "INITIAL_LOGIN" && (
            <>
              <div>
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          {mode === "2FA" && (
            <div>
              <label>TOTP (Authenticator Code)</label>
              <input
                type="text"
                name="totp"
                placeholder="Enter 6-digit code"
                value={formData.totp}
                onChange={handleChange}
              />
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="card-actions justify-end">
            <button type="submit" className="btn" disabled={shouldDisableButton}>
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Login = ({ appInfo, isAuthenticated }: { appInfo?: AppInfo; isAuthenticated: boolean }) => {
  const [nowAuthenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated || nowAuthenticated) {
      // not using navigte() here because we want the browser to refresh
      window.location.href = "/";
    }
  }, [nowAuthenticated]);

  if (!appInfo) {
    return <div>Loading...</div>;
  }

  if (nowAuthenticated) {
    return (
      <div>
        <div>
          <div>Redirecting...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen">
      <CredentialForm onSuccess={() => setAuthenticated(true)} />
      {(appInfo.signup === "OPEN" || appInfo.user_count === 0) && (
        <button onClick={() => navigate("/signup")}>Sign Up</button>
      )}
    </div>
  );
};

export default Login;
