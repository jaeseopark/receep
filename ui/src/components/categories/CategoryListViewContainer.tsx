import { useNavigate } from "react-router-dom";

import { ROUTE_PATHS } from "@/const";
import { sigCategories } from "@/store";

import CategoryListView from "@/components/categories/CategoryListView";

const CategoryListViewContainer = () => {
  const navigate = useNavigate();

  return <CategoryListView categories={sigCategories.value} onAdd={() => navigate(ROUTE_PATHS.NEW_CATEGORY)} />;
};

export default CategoryListViewContainer;
