import { useCallback } from "preact/hooks";
import { Controller, SubmitHandler, useForm } from "react-hook-form";

import { UserInfo } from "@/types";

import { axios } from "@/api";
import { sigUserInfo } from "@/store";

type FormData = {
  taxRate: string;
};

const ConfigForm = ({ onSubmit }: { onSubmit: SubmitHandler<FormData> }) => {
  const { control, handleSubmit } = useForm<FormData>({
    defaultValues: {
      taxRate: sigUserInfo.value?.config?.tax_rate?.toString() || "0.1",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <div>
          <label>Tax Rate</label>
          <Controller
            name="taxRate"
            control={control}
            render={({ field }) => (
              <input type="string" {...field} placeholder="Enter tax rate in fraction Ex. 0.1" />
            )}
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

  return <ConfigForm onSubmit={onSubmit} />;
};

export default Config;
