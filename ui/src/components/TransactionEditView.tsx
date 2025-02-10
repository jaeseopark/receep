import { Save, ZoomIn } from "lucide-preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

import { Transaction } from "@/types";

import { axios } from "@/api";
import { sigTransactions, sigUserInfo, upsertTransactions } from "@/store";

const TransactionEditView = () => {
  const [formData, setFormData] = useState<Transaction>();
  const { id } = useParams();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm();
  const navigate = useNavigate();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "line_items",
  });

  useEffect(() => {
    const init = () => {
      if (!sigUserInfo.value) {
        setTimeout(init, 100);
        return;
      }

      if (!id) {
        setFormData({
          id: -1,
          created_at: Date.now() / 1000,
          user_id: sigUserInfo.value?.user_id,
          line_items: [],
        });
        return;
      }

      if (!Number.isInteger(id)) {
        toast.error("The transaction id is not a valid integer.");
        return;
      }

      const [t] = sigTransactions.value.filter((t) => t.id === Number.parseInt(id));
      if (t) {
        setFormData({ ...t });
        return;
      }

      toast.error("The requested transaction does not exist");
    };

    setTimeout(init, 100);
  }, []);

  const save = useCallback((data: Transaction) => {
    axios
      .post("/api/transactions", data, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      .then((r) => r.data)
      .then((transaction) => {
        upsertTransactions([transaction]);
        toast.success("Transaction saved.");
        navigate("/transactions");
      });
  }, []);

  if (!formData) {
    return <div>Loading data...</div>;
  }

  const renderVendorField = () => {
    return (
      <label className="block">
        <span className="text-gray-700">Vendor</span>
        <input
          {...register("vendor")}
          className="mt-1 block w-full p-2 border rounded"
          placeholder="Enter vendor name"
        />
      </label>
    );
  };

  const renderNotesField = () => {
    return (
      <label className="block">
        <span className="text-gray-700">Notes</span>
        <textarea
          {...register("notes")}
          className="mt-1 block w-full p-2 border rounded"
          placeholder="Additional notes"
        ></textarea>
      </label>
    );
  };

  const renderSimpleForm = () => {
    return (
      <>
        {renderVendorField()}
        {renderNotesField()}
      </>
    );
  };

  const renderAdvancedForm = () => {
    return (
      <>
        <label className="block">
          <span className="text-gray-700">Vendor</span>
          <input
            {...register("vendor")}
            className="mt-1 block w-full p-2 border rounded"
            placeholder="Enter vendor name"
          />
        </label>
        <h3 className="text-lg font-semibold">Line Items</h3>
        {fields.map((item, index) => (
          <div key={item.id} className="p-4 border rounded-lg space-y-2">
            <label className="block">
              <span className="text-gray-700">Name</span>
              <input
                {...register(`line_items.${index}.name`)}
                className="mt-1 block w-full p-2 border rounded"
                placeholder="Item name"
              />
            </label>

            <label className="block">
              <span className="text-gray-700">Amount</span>
              <input
                type="number"
                {...register(`line_items.${index}.amount`)}
                className="mt-1 block w-full p-2 border rounded"
              />
            </label>

            <label className="block">
              <span className="text-gray-700">Category ID</span>
              <input
                type="number"
                {...register(`line_items.${index}.category_id`)}
                className="mt-1 block w-full p-2 border rounded"
              />
            </label>

            <label className="block">
              <span className="text-gray-700">Biz Portion Input</span>
              <input
                {...register(`line_items.${index}.biz_portion_input`)}
                className="mt-1 block w-full p-2 border rounded"
              />
            </label>

            <label className="block">
              <span className="text-gray-700">Biz Portion</span>
              <input
                type="number"
                {...register(`line_items.${index}.biz_portion`)}
                className="mt-1 block w-full p-2 border rounded"
              />
            </label>

            <label className="block">
              <span className="text-gray-700">Notes</span>
              <textarea
                {...register(`line_items.${index}.notes`)}
                className="mt-1 block w-full p-2 border rounded"
                placeholder="Item notes"
              ></textarea>
            </label>

            <button
              type="button"
              className="mt-2 bg-red-500 text-white px-4 py-2 rounded"
              onClick={() => remove(index)}
            >
              Remove
            </button>
          </div>
        ))}

        <button
          type="button"
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() =>
            append({
              id: Date.now(),
              name: "",
              transaction_id: formData.id!,
              amount: 0,
              category_id: 0,
              biz_portion_input: "",
              biz_portion: 0,
            })
          }
        >
          Add Line Item
        </button>
        <label className="block">
          <span className="text-gray-700">Notes</span>
          <textarea
            {...register("notes")}
            className="mt-1 block w-full p-2 border rounded"
            placeholder="Additional notes"
          ></textarea>
        </label>
      </>
    );
  };

  const title = id ? "Edit Transaction" : "New Transaction";

  return (
    <>
      <form onSubmit={handleSubmit(console.log)} className="space-y-4 p-4">
        <h2 className="text-xl font-bold">{title}</h2>

        <div className="tabs tabs-box">
          <input type="radio" name="form_layout" className="tab" aria-label="Simple" defaultChecked />
          <div className="tab-content bg-base-100 border-base-300 p-6">{renderSimpleForm()}</div>

          <input type="radio" name="form_layout" className="tab" aria-label="Advanced" />
          <div className="tab-content bg-base-100 border-base-300 p-6">{renderAdvancedForm()}</div>
        </div>

        <div className="bottom-24 fixed right-6 shadow-lg rounded-full">
          <button
            type="submit"
            className="btn btn-circle btn-primary"
            onClick={() => {
              navigate("/transactions/new");
            }}
          >
            <Save />
          </button>
        </div>
      </form>
      <div className="bottom-24 fixed right-20 shadow-lg rounded-full">
        <button
          className="btn btn-circle btn-primary"
          onClick={() => {
            // TODO: zoom in on the image
          }}
        >
          <ZoomIn />
        </button>
      </div>
    </>
  );
};

export default TransactionEditView;
