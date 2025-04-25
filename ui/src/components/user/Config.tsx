import { useCallback } from "preact/hooks";
import { Controller, SubmitHandler, useForm } from "react-hook-form";

import { UserInfo } from "@/types";

import { axios } from "@/api";
import { sigUserInfo } from "@/store";

type FormData = {
  taxRate: string;
  currencyDecimalPlaces: string;
};

const ConfigForm = ({ config, onSubmit }: { config: UserInfo["config"]; onSubmit: SubmitHandler<FormData> }) => {
  const { control, handleSubmit } = useForm<FormData>({
    defaultValues: {
      taxRate: config.tax_rate.toString(),
      currencyDecimalPlaces: config.currency_decimal_places.toString(),
    },
  });

  // todo make this pretty
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <div>
          <label>Tax Rate</label>
          <Controller
            name="taxRate"
            control={control}
            render={({ field }) => <input type="string" {...field} placeholder="Enter tax rate in fraction Ex. 0.1" />}
          />
        </div>
        <div>
          <label>Currency Decimal Places</label>
          <Controller
            name="currencyDecimalPlaces"
            control={control}
            render={({ field }) => <input type="number" {...field} placeholder="Enter currency decimal places Ex. 2" />}
          />
        </div>
      </div>
      <button type="submit">Submit</button>
    </form>
  );
};

const Config = () => {
  if (!sigUserInfo.value) {
    return <div>Loading...</div>;
  }

  const onSubmit = useCallback(
    (formData: FormData) => {
      const updatedConfig: UserInfo["config"] = {
        tax_rate: Number.parseFloat(formData.taxRate),
        currency_decimal_places: Number.parseInt(formData.currencyDecimalPlaces),
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
        });
    },
    [sigUserInfo.value],
  );

  return <ConfigForm config={sigUserInfo.value!.config} onSubmit={onSubmit} />;
};

export default Config;
