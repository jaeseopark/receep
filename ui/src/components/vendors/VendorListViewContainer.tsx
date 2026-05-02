import { useNavigate } from "react-router-dom";

import { ROUTE_PATHS } from "@/const";
import { sigVendors } from "@/store";

import VendorListView from "@/components/vendors/VendorListView";

const VendorListViewContainer = () => {
  const navigate = useNavigate();

  return <VendorListView vendors={sigVendors.value} onAdd={() => navigate(ROUTE_PATHS.NEW_VENDOR)} />;
};

export default VendorListViewContainer;
