import { toast } from "react-hot-toast";

import { Receipt } from "@/types";

import { axios } from "@/api";
import { removeReceipt, replaceReceipt, upsertReceipts } from "@/store";
import { hash } from "@/utils/primitive";

type UploadProgrses = {
  filename: string;
  isActive: boolean; // whether the file is actively being uploaded.
  progress: number; // range: [0, 1]
};

export const uploadReceipts = (
  files: File[],
  reportProgress: (uploadProgressArray: UploadProgrses[]) => void,
  granularity = 0.1,
): Promise<void> => {
  // Add blank receipts to display spinners while uploading
  upsertReceipts({
    items: files.map((file) => ({
      id: hash(file.name),
      user_id: 0,
      content_type: "",
      content_length: 0,
      content_hash: "",
      is_uploading: true,
      created_at: Date.now() / 1000,
      transactions: [],
      rotation: 0,
      ocr_metadata: {},
    })),
  });

  const progressObjects: UploadProgrses[] = files.map(({ name }) => ({
    filename: name,
    isActive: false,
    progress: 0,
  }));

  return files.reduce((prevPromise, file, i): Promise<void> => {
    return prevPromise.then(() => {
      const formData = new FormData();
      formData.append("file", file, file.name);

      return axios
        .post(`/api/receipts`, formData, {
          headers: {
            Accept: "application/json",
          },
          onUploadProgress: ({ loaded, total }) => {
            if (!Number.isNaN(total)) {
              const progress = loaded / total!;
              const isBigEnough = progressObjects[i].progress + granularity < progress;
              if (isBigEnough) {
                progressObjects[i].isActive = true;
                progressObjects[i].progress = progress;
                reportProgress(progressObjects);
              }
            }
          },
        })
        .then((r) => r.data)
        .then((receipt: Receipt) => {
          replaceReceipt(hash(file.name), receipt);
          progressObjects[i].isActive = false;
          progressObjects[i].progress = 1;
          reportProgress(progressObjects);
        })
        .catch((e) => {
          if (e?.response?.data?.code === "DUP_RECEIPT") {
            toast.error("The receipt already exists.");
          }
          removeReceipt(hash(file.name));
        });
    });
  }, Promise.resolve());
};
