import { Plus } from "lucide-preact";
import { v4 as uuidv4 } from "uuid";

import { Category } from "@/types";

import { axios } from "@/api";
import { sigCategories, upsertCategories } from "@/store";
import { hash } from "@/utils/primitive";

const DEFAULT_NEW_CATEGORY_ID = 0;
const DEFAULT_NEW_CATEGORY_USER_ID = 0;

const CategoryListView = () => {
  const createCategory = () => {
    const category: Category = {
      id: DEFAULT_NEW_CATEGORY_ID,
      user_id: DEFAULT_NEW_CATEGORY_USER_ID,
      name: `cat-${hash(uuidv4())}`,
      description: `desc-${hash(uuidv4())}`,
    };
    axios
      .post("/api/categories", category)
      .then((r) => r.data)
      .then((returnedCategory: Category) => {
        upsertCategories({ items: [returnedCategory] });
      });
  };

  return (
    <div>
      <ul className="list bg-base-100 rounded-box shadow-md">
        <li className="p-4 pb-2 text-xs opacity-60 tracking-wide">Categories</li>

        {sigCategories.value.map(({ id, name, description }) => (
          <li key={id} className="list-row">
            <div>
              <div>{name}</div>
              <div className="text-xs uppercase font-semibold opacity-60">{description}</div>
            </div>
            <button className="btn btn-square btn-ghost">Edit</button>
            <button className="btn btn-square btn-ghost">Delete</button>
          </li>
        ))}
      </ul>
      <div className="bottom-24 fixed right-6 shadow-lg rounded-full">
        <button className="btn btn-circle btn-primary" onClick={createCategory}>
          <Plus />
        </button>
      </div>
    </div>
  );
};

export default CategoryListView;
