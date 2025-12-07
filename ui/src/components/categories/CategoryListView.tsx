import { Plus, Percent } from "lucide-preact";
import { useNavigate } from "react-router-dom";

import { ROUTE_PATHS } from "@/const";
import { sigCategories } from "@/store";
import { getEditCategoryPath } from "@/utils/paths";

const CategoryListView = () => {
  const navigate = useNavigate();

  return (
    <div className="m-4 flex justify-center h-full overflow-x-scroll">
      <ul className="list bg-base-100 rounded-box shadow-md w-full max-w-[450px] h-fit-content">
        <h1 className="p-4 pb-2 tracking-wide text-2xl font-bold">Categories</h1>
        {sigCategories.value.map(({ id, name, description, with_autotax }) => (
          <li key={id} className="list-row flex items-center gap-4 p-4">
            <div className="hover:underline" onClick={() => navigate(getEditCategoryPath(id))}>
              <div className="flex items-center gap-2">
                <div>{name}</div>
                {with_autotax && (
                  <div className="flex items-center gap-1">
                    <Percent size={16} className="text-primary" />
                    <span className="text-xs text-primary">Autotax</span>
                  </div>
                )}
              </div>
              <div className="text-xs uppercase font-semibold opacity-60">{description}</div>
            </div>
            <div className="flex-grow" />
          </li>
        ))}
      </ul>
      <div className="bottom-24 fixed right-6 shadow-lg rounded-full">
        <button className="btn btn-circle btn-primary" onClick={() => navigate(ROUTE_PATHS.NEW_CATEGORY)}>
          <Plus />
        </button>
      </div>
    </div>
  );
};

export default CategoryListView;
