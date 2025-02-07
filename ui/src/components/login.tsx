import { axios, setJwt } from "@/api";
import { Box, Button, Center, Input, Text, VStack } from "@chakra-ui/react";
import { useEffect, useState } from "preact/hooks";
import { Link, useNavigate } from "react-router-dom";

const CredentialForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    totp: "",
  });
  const [mode, setMode] = useState<"INITIAL_LOGIN" | "2FA">("INITIAL_LOGIN");
  const [error, setError] = useState("");

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = (event) => {
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
    <Box maxW="400px" mx="auto" mt="100px" p="6" borderWidth="1px" borderRadius="lg" boxShadow="md">
      <form onSubmit={handleSubmit}>
        <VStack spacing="4">
          {mode === "INITIAL_LOGIN" && (
            <>
              <div>
                <Text>Username</Text>
                <Input
                  type="text"
                  name="username"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>

              <div>
                <Text>Password</Text>
                <Input
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
              <Text>TOTP (Authenticator Code)</Text>
              <Input
                type="text"
                name="totp"
                placeholder="Enter 6-digit code"
                value={formData.totp}
                onChange={handleChange}
              />
            </div>
          )}

          {error && <Text color="red.500">{error}</Text>}

          <Button colorScheme="blue" type="submit" width="full" disabled={shouldDisableButton}>
            Login
          </Button>
        </VStack>
      </form>
    </Box>
  );
};

// TODO: app info type
export const Login = ({ appInfo }: any) => {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      // not using navigte() here because we want the browser to refresh
      window.location.href = "/";
    }
  }, [isAuthenticated]);

  if (!appInfo) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated) {
    return (
      <Center>
        <VStack>
          <div>Redirecting...</div>
        </VStack>
      </Center>
    );
  }

  return (
    <Center>
      <div>
        <CredentialForm onSuccess={() => setAuthenticated(true)} />
        {(appInfo.signup === "OPEN" || appInfo.user_count === 0) && (
          <Button
            style={{
              width: "100%",
              "margin-top": "1em",
            }}
            onClick={() => navigate("/signup")}
          >
            Sign Up
          </Button>
        )}
      </div>
    </Center>
  );
};

export const Signup = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [qrBase64, setQrBase64] = useState<string>();
  const [qrMessage, setQrMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const handleSubmit = (e) => {
    e.preventDefault();
    axios
      .post("/api/signup", formData, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      .then((r) => r.data)
      .then(({ token, qrcode_b64, message }) => {
        setJwt(token);
        setQrBase64(qrcode_b64);
        setQrMessage(message);
      });
  };

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const shouldDisableButton = (() => {
    if (!formData.username || !formData.password || formData.password !== formData.confirmPassword) {
      return true;
    }

    return false;
  })();

  return (
    <Box maxW="400px" mx="auto" mt="100px" p="6" borderWidth="1px" borderRadius="lg" boxShadow="md">
      {!qrBase64 && (
        <form onSubmit={handleSubmit}>
          <VStack spacing="4">
            <>
              <div>
                <Text>Username</Text>
                <Input
                  type="text"
                  name="username"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>

              <div>
                <Text>Password</Text>
                <Input
                  type="password"
                  name="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <div>
                <Text>Confirm Password</Text>
                <Input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </>

            {error && <Text color="red.500">{error}</Text>}

            <Button colorScheme="blue" type="submit" width="full" disabled={shouldDisableButton}>
              OK
            </Button>
          </VStack>
        </form>
      )}
      {qrBase64 && (
        <div>
          <Text>
            Scan the following QR code with your authenticator app for future logins. This code will not be shown again,
            so be sure to save it.
          </Text>
          <img src={`data:image/png;base64,${qrBase64}`} alt="QR Code" />
          <Text>{qrMessage}</Text>
          <a href="/">
            <Button style={{ width: "100%" }}>I have scanned the code</Button>
          </a>
        </div>
      )}
    </Box>
  );
};
