import { useMemo, useState } from "preact/hooks";
import { useSearchParams } from "react-router-dom";

import { axios, setJwt } from "@/api";

const Signup = ({ appInfo }: any) => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [qrBase64, setQrBase64] = useState<string>();
  const [qrMessage, setQrMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [params] = useSearchParams();
  const invitedUsername = useMemo(() => {
    const invitation = params.get("invitation");
    return invitation && atob(invitation);
  }, [params]);

  const handleSubmit = (e) => {
    e.preventDefault();

    let path = "/api/signup";
    const payload = { ...formData };
    if (invitedUsername) {
      path = "/api/invite/accept";
      payload.username = invitedUsername;
    }

    axios
      .post(path, payload, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      .then((r) => r.data)
      .then(({ token, qrcode_b64, message }) => {
        setJwt(token);
        setQrBase64(qrcode_b64);
        setQrMessage(message);
      })
      .catch((e) => {
        if (e.response.status === 401) {
          if (appInfo.signup === "INVITE_ONLY") {
            setError("You must be invited by an existing member.");
            return;
          }

          setError("Signup is currently closed.");
          return;
        }

        setError(JSON.stringify(e.response.data));
      });
  };

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const shouldDisableButton = (() => {
    if (
      !(invitedUsername || formData.username) ||
      !formData.password ||
      formData.password !== formData.confirmPassword
    ) {
      return true;
    }

    return false;
  })();

  return (
    <div maxW="400px" mx="auto" mt="100px" p="6" borderWidth="1px" borderRadius="lg" boxShadow="md">
      {!qrBase64 && (
        <form onSubmit={handleSubmit}>
          <div marginBottom="2em">
            <h1>Signup</h1>
          </div>
          <div spacing="4">
            <>
              <div>
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  placeholder="Enter username"
                  value={invitedUsername || formData.username}
                  onChange={handleChange}
                  disabled={!!invitedUsername}
                />
              </div>

              <div>
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label>Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </>

            {error && <label color="red.500">{error}</label>}

            <button colorScheme="blue" type="submit" width="full" disabled={shouldDisableButton} marginTop="2em">
              OK
            </button>
          </div>
        </form>
      )}
      {qrBase64 && (
        <div>
          <label>
            Scan the following QR code with your authenticator app for future logins. This code will not be shown again,
            so be sure to save it.
          </label>
          <img src={`data:image/png;base64,${qrBase64}`} alt="QR Code" />
          <label>{qrMessage}</label>
          <a href="/">
            <button style={{ width: "100%" }}>I have scanned the code</button>
          </a>
        </div>
      )}
    </div>
  );
};

export default Signup;
