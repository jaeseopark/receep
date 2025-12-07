import { Plus } from "lucide-preact";
import { useNavigate } from "react-router-dom";

import { ROUTE_PATHS } from "@/const";
import { sigVendors } from "@/store";
import { getEditVendorPath } from "@/utils/paths";

const VendorListView = () => {
  const navigate = useNavigate();

  return (
    <div className="m-4 flex justify-center h-full overflow-x-scroll">
      <ul className="list bg-base-100 rounded-box shadow-md w-full max-w-[450px] h-fit-content">
        <h1 className="p-4 pb-2 tracking-wide text-2xl font-bold">Vendors</h1>
        {sigVendors.value.map(({ id, name }) => (
          <li key={id} className="list-row flex items-center gap-4 p-4">
            <div className="hover:underline" onClick={() => navigate(getEditVendorPath(id))}>
              <div>{name}</div>
            </div>
            <div className="flex-grow" />
          </li>
        ))}
      </ul>
      <div className="bottom-24 fixed right-6 shadow-lg rounded-full">
        <button className="btn btn-circle btn-primary" onClick={() => navigate(ROUTE_PATHS.NEW_VENDOR)}>
          <Plus />
        </button>
      </div>
    </div>
  );
};

export default VendorListView;
