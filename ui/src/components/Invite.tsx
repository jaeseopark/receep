import { useState } from "preact/hooks";

import { axios } from "@/api";

const Invite = () => {
  const [formData, setFormData] = useState({
    username: "",
  });
  const [isInviteSuccess, setInviteSuccess] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = (e) => {
    e.preventDefault();

    axios
      .post("/api/invite", formData, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      .then((r) => r.data)
      .then(() => setInviteSuccess(true))
      .catch((e) => {
        // TODO better err handling
        setError(JSON.stringify(e.response.data));
      });
  };

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  return (
    <div>
      {!isInviteSuccess && (
        <form onSubmit={handleSubmit}>
          <div marginBottom="2em">
            <h1>Invite</h1>
          </div>
          <div spacing="4">
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

            {error && <label color="red.500">{error}</label>}

            <button colorScheme="blue" type="submit" width="full" marginTop="2em">
              OK
            </button>
          </div>
        </form>
      )}
      {isInviteSuccess && (
        <div>
          Share the following link:
          <pre
            style={{ width: "100%" }}
          >{`${window.location.origin}/signup?invitation=${btoa(formData.username)}`}</pre>
        </div>
      )}
    </div>
  );
};

export default Invite;
