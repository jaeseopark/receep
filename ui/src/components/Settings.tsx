import { useNavigate } from "react-router-dom";

import Me from "@/components/Me";

const Settings = () => {
  const navigate = useNavigate();

  return (
    <div>
      <ul className="list bg-base-100 rounded-box shadow-md">
        <li className="list-row">
          <Me />
        </li>
        <li className="list-row">
          <button onClick={() => navigate("/settings/invite")}>Invite</button>
        </li>
        <li className="list-row">
          <button onClick={() => navigate("/settings/categories")}>Categories</button>
        </li>
      </ul>
    </div>
  );
};

export default Settings;
