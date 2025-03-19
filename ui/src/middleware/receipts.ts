import { toast } from "react-hot-toast";

import { Receipt } from "@/types";

import { axios } from "@/api";
import { removeReceipt, replaceReceipt, upsertReceipts } from "@/store";
import { hash } from "@/utils/primitive";

export const uploadReceipts = (files: File[]): Promise<void>[] => {
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

  return files.map((file): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file, file.name);

    return axios
      .post(`/api/receipts`, formData, {
        headers: {
          Accept: "application/json",
        },
      })
      .then((r) => r.data)
      .then((receipt: Receipt) => {
        replaceReceipt(hash(file.name), receipt);
      })
      .catch((e) => {
        if (e?.response?.data?.code === "DUP_RECEIPT") {
          toast.error("The receipt already exists.");
        }
        removeReceipt(hash(file.name));
      });
  });
};
