import { Save } from "lucide-preact";
import { useCallback } from "preact/hooks";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { UserInfo } from "@/types";

import { axios } from "@/api";
import { ROUTE_PATHS } from "@/const";
import { sigUserInfo } from "@/store";

type FormData = {
  taxRate: string;
  currencyDecimalPlaces: string;
  advanced_mode: boolean;
};

const ConfigForm = ({ config }: { config: UserInfo["config"] }) => {
  const { control, handleSubmit } = useForm<FormData>({
    defaultValues: {
      taxRate: config.tax_rate.toString(),
      currencyDecimalPlaces: config.currency_decimal_places.toString(),
    },
  });

  const navigate = useNavigate();

  const onSubmit = useCallback(
    (formData: FormData) => {
      const updatedConfig: UserInfo["config"] = {
        tax_rate: Number.parseFloat(formData.taxRate),
        currency_decimal_places: Number.parseInt(formData.currencyDecimalPlaces),
        advanced_mode: Boolean(formData.advanced_mode),
      };

      axios
        .put("/api/me/config", updatedConfig, {
          headers: {
            "Content-Type": "application/json",
          },
        })
        .then((r) => r.data)
        .then(() => {
          sigUserInfo.value!.config = updatedConfig;
        })
        .then(() => {
          toast.success("Config updated successfully");
          navigate(ROUTE_PATHS.SETTINGS);
        });
    },
    [sigUserInfo.value],
  );

  // todo make this pretty
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <table className="table-auto w-full border-collapse border border-gray-300">
        <tbody>
          <tr className="border-b border-gray-300">
            <td className="p-4 font-medium text-gray-700">Tax Rate</td>
            <td className="p-4">
              <Controller
                name="taxRate"
                control={control}
                render={({ field }) => (
                  <input
                    type="text"
                    {...field}
                    placeholder="Enter tax rate in fraction Ex. 0.1"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-primary-300"
                  />
                )}
              />
            </td>
          </tr>
          <tr>
            <td className="p-4 font-medium text-gray-700">Currency Decimal Places</td>
            <td className="p-4">
              <Controller
                name="currencyDecimalPlaces"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    {...field}
                    placeholder="Enter currency decimal places Ex. 2"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-primary-300"
                  />
                )}
              />
            </td>
          </tr>
        </tbody>
      </table>
      <div className="bottom-24 fixed right-6 shadow-lg rounded-full">
        <button type="submit" className="btn btn-circle btn-primary">
          <Save />
        </button>
      </div>
    </form>
  );
};

const Config = () => {
  if (!sigUserInfo.value) {
    return <div>Loading...</div>;
  }

  return <ConfigForm config={sigUserInfo.value!.config} />;
};

export default Config;
