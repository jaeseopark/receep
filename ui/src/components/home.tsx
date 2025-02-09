import { useEffect, useState } from "preact/hooks";

import { UserInfo } from "@/types";

import { axios } from "@/api";
import { Center, VStack } from "@chakra-ui/react";

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

export default Home;
