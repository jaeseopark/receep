import { Camera } from "lucide-preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { useDropzone } from "react-dropzone";

import { axios } from "@/api";

type Receipt = {
  id: number;
  userId: number;
  contentType: string;
  contentLength: number;
  contentHash: string;
  isUploading: boolean;
};

const getThumbnailPath = (receiptId: number) => `/${receiptId}-thumb.dr`;

function hash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0; // Keep it unsigned
  }
  return hash;
}

const ReceiptView = () => {
  const [isReady, setReady] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 50,
  });

  useEffect(() => {
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
        setReceipts((prev) => [...prev, ...items]);
      })
      .finally(() => {
        setReady(true);
      });
  }, []);

  const uploadReceipts = (files: File[]): Promise<void>[] => {
    //Note: assumption - file names are unique.

    // Add blank receipts to display spinners while uploading
    setReceipts((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: hash(file.name),
        userId: 0,
        contentType: "",
        contentLength: 0,
        contentHash: "",
        isUploading: true,
      })),
    ]);

    return files.map((file): Promise<void> => {
      const formData = new FormData();
      formData.append("file", file, file.name);

      return fetch(`/api/receipts`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      })
        .then((r) => r.json())
        .then((receipt: Receipt) => {
          setReceipts((prev) =>
            prev.reduce((acc, next) => {
              if (next.isUploading && next.id === hash(file.name)) {
                return [...acc, receipt];
              }
              return [...acc, next];
            }, [] as Receipt[]),
          );
        });
    });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log(acceptedFiles);
    Promise.allSettled(uploadReceipts(acceptedFiles)).then(() => {
      //TODO: toast
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  if (!isReady) {
    return <div>Loading...</div>;
  }

  const renderDndZone = () => {
    return (
      <div className="space-y-2 p-4 bg-gray-100 rounded-lg border border-gray-300">
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          {isDragActive ? <p>Drop the files here ...</p> : <Camera className="w-6 h-6" />}
        </div>
      </div>
    );
  };

  const renderReceipts = () => {
    if (!receipts.length) {
      return <div>No Receipts</div>;
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
        {receipts.map(({ id, contentHash }) => (
          <div className="card" key={id}>
            <div className="card-body">
              <img src={getThumbnailPath(id)} className="w-full h-auto rounded-md object-cover" />
              <div>{contentHash}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="receipt-view">
      {renderDndZone()}
      {renderReceipts()}
    </div>
  );
};

export default ReceiptView;
