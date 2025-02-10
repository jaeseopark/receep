import { useState } from "preact/hooks";

import { sigUserInfo } from "@/store";

const Me = () => {
  const [error, setError] = useState<string>();

  const render = () => {
    if (!sigUserInfo.value) {
      return <div>Loading...</div>;
    }

    if (error) {
      return <div>{error}</div>;
    }

    return (
      <div>
        <div>
          Welcome, <span className="variable">{sigUserInfo.value.username}</span>!
        </div>
        {sigUserInfo.value.roles.length === 1 ? (
          <div>
            Your role is: <span className="variable">{sigUserInfo.value.roles[0]}</span>.
          </div>
        ) : (
          <div>
            Your roles are: [
            {sigUserInfo.value.roles.map((role) => (
              <span key={role} className="variable">
                {role}
              </span>
            ))}
            ].
          </div>
        )}
      </div>
    );
  };

  return render();
};

export default Me;
