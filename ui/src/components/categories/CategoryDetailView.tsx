import { useEffect, useState } from "preact/hooks";
import { toast } from "react-hot-toast";
import { useParams } from "react-router-dom";

import { Category } from "@/types";

import CategoryForm from "@/components/categories/CategoryForm";
import { sigInitialLoadResult } from "@/gvars";
import { sigCategories } from "@/store";
import { isPositiveInteger } from "@/utils/primitive";

const CategoryDetailView = () => {
  const { id } = useParams();
  const [category, setCategory] = useState<Category>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const init = () => {
      if (sigInitialLoadResult.value === "PENDING") {
        setTimeout(init, 100);
        return;
      }

      if (sigInitialLoadResult.value === "FAILED") {
        setError("Initial load failed");
        return;
      }

      if (id === "-1") {
        const newCategory: Category = {
          id: -1,
          user_id: -1,
          name: "",
          description: "",
        };
        setCategory(newCategory);
        return;
      }

      if (!isPositiveInteger(id)) {
        toast.error(`The category id is not a valid integer. id='${id}'`);
        return;
      }

      const category = sigCategories.value.find((c) => c.id === Number.parseInt(id!));

      if (!category) {
        toast.error(`The requested category ID does not exist or does not belong to you. id='${id}'`);
        return;
      }

      setCategory(category);
    };

    setTimeout(init, 100);
  }, []);

  if (error) {
    return <div>{error}</div>;
  }

  if (!category) {
    return <div>Loading data...</div>;
  }

  const title = category.id === -1 ? "New Category" : "Edit Category";

  return (
    <div className="space-y-4 p-4 md:h-(--content-max-height)">
      <h2 className="text-xl font-bold justify-center">{title}</h2>
      <CategoryForm category={category} />
    </div>
  );
};

export default CategoryDetailView;
