import classNames from "classnames";
import { formatDistanceToNow } from "date-fns";
import { Circle, CircleCheck, Plus } from "lucide-preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";

import { Receipt } from "@/types";

import { axios } from "@/api";
import { removeReceipt, replaceReceipt, sigReceipts, upsertReceipts } from "@/store";
import { hash } from "@/utils/primitive";

const getThumbnailPath = (receiptId: number) => `/${receiptId}-thumb.dr`;

const Receipts = () => {
  const [isReady, setReady] = useState(false);
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 50,
  });

  const getReceipts = useCallback(() => {
    axios
      .get("/api/receipts/paginated", {
        params: { ...pagination },
      })
      .then((r) => r.data)
      .then(({ next_offset, items }: { next_offset: number; items: Receipt[] }) => {
        setPagination((prev) => ({
          ...prev,
          offset: next_offset,
        }));
        upsertReceipts(items);
      })
      .finally(() => {
        setReady(true);
      });
  }, [pagination]);

  useEffect(getReceipts, []);

  const uploadReceipts = (files: File[]): Promise<void>[] => {
    // Add blank receipts to display spinners while uploading
    upsertReceipts(
      files.map((file) => ({
        id: hash(file.name),
        user_id: 0,
        content_type: "",
        content_length: 0,
        content_hash: "",
        is_uploading: true,
        created_at: Date.now() / 1000,
        transactions: [],
      })),
    );

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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    Promise.allSettled(uploadReceipts(acceptedFiles)).then(() => {
      //TODO: toast
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  /* ---------------------------------------
   * End of hooks
   * --------------------------------------- */

  if (!isReady) {
    return <div>Loading...</div>;
  }

  // The dnd zone is the whole component, and we don't want the onclick handler on that.
  // There is a separate upload button in the corner.
  const { onClick: _, ...restDndRootProps } = getRootProps();

  const renderReceipts = () => {
    // TODO: use react-table to enable interactive sorting rather than manipulating the array directly.
    if (!sigReceipts.value.length) {
      return <div>No Receipts</div>;
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 overflow-hidden">
        {sigReceipts.value.map(({ id, created_at, transactions }) => (
          <div key={id} className="card bg-base-100 w-48 h-48 shadow-sm">
            <figure>
              <img src={getThumbnailPath(id)} alt={id} />
            </figure>
            <div className="card-body m-0 p-0">
              <h2 className="card-title">{formatDistanceToNow(new Date(created_at * 1000), { addSuffix: true })}</h2>
              {(transactions || []).length > 0 && <CircleCheck />}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className={classNames("receipt-view", {
        "rounded-lg border bg-gray-100 border-gray-300": isDragActive,
      })}
      {...restDndRootProps}
    >
      <input {...getInputProps()} />
      {renderReceipts()}
      <div className="bottom-24 fixed right-6 shadow-lg rounded-full">
        <input
          id="receipt-input"
          type="file"
          accept="image/*"
          className="hidden"
          multiple
          onChange={(e) => {
            const files: File[] = e?.target?.files || [];
            if (files.length > 0) {
              uploadReceipts([...files]);
            }
          }}
        />
        <button
          className="btn btn-circle btn-primary"
          onClick={() => document.getElementById("receipt-input")?.click()}
        >
          <Plus />
        </button>
      </div>
    </div>
  );
};

export default Receipts;
