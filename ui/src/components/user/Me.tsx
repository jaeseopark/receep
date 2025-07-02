import { sigUserInfo } from "@/store";

const Me = () => {
  if (!sigUserInfo.value) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      Welcome, <span className="variable">{sigUserInfo.value.username}</span>!{" "}
      {sigUserInfo.value.roles.length === 1 ? (
        <>
          Your role is: <span className="variable">{sigUserInfo.value.roles[0]}</span>.
        </>
      ) : (
        <>
          Your roles are: [
          {sigUserInfo.value.roles.map((role) => (
            <span key={role} className="variable">
              {role}
            </span>
          ))}
          ].
        </>
      )}
    </div>
  );
};

export default Me;
