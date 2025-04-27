import { GitMerge, Save, Trash } from "lucide-react";
import { useMemo } from "preact/hooks";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { Category } from "@/types";

import { axios } from "@/api";
import { ROUTE_PATHS } from "@/const";
import { upsertCategories } from "@/store";

const CategoryForm = ({ category }: { category: Category }) => {
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm<Category>({
    defaultValues: category,
  });

  const isNewCategory = useMemo(() => {
    return category.id === -1;
  }, [category]);

  const onSubmit = (data: Category) => {
    let promise;
    if (isNewCategory) {
      promise = axios.post("/api/categories", data, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    } else {
      promise = axios.put(`/api/categories/${category.id}`, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    promise
      .then((r) => r.data)
      .then((newCategory) => {
        upsertCategories({ items: [newCategory] });
      })
      .then(() => {
        toast.success("Category saved.");
        navigate(ROUTE_PATHS.CATEGORIES);
      });
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            {...register("name", { required: true })}
            type="text"
            className="mt-1 block w-full p-2 border rounded"
            placeholder="Category Name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            {...register("description")}
            className="mt-1 block w-full p-2 border rounded"
            placeholder="Category Description"
          />
        </div>
        <div className="bottom-24 fixed right-6 shadow-lg rounded-full">
          <button type="submit" className="btn btn-circle btn-primary">
            <Save />
          </button>
        </div>
      </form>
      <div className="bottom-24 fixed right-20 shadow-lg rounded-full">
        <button
          type="button"
          className="btn btn-circle bg-red-500 hover:bg-red-600 text-white"
          onClick={() => {
            // TODO: Handle delete action
            console.log("Delete category");
          }}
        >
          <Trash />
        </button>
      </div>
      <div className="bottom-24 fixed right-34 shadow-lg rounded-full">
        <button
          type="button"
          className="btn btn-circle bg-gray-500 hover:bg-gray-600 text-white"
          onClick={() => {
            // TODO: Handle merge action
            console.log("Merge categories");
          }}
        >
          <GitMerge />
        </button>
      </div>
    </div>
  );
};

export default CategoryForm;
