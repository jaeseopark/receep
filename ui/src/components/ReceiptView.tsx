import { Card, Image, SimpleGrid, Text } from "@chakra-ui/react";
import { AxiosInstance } from "axios";
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
    (axios as AxiosInstance)
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

  const renderReceipts = () => {
    if (!receipts.length) {
      return <div>No Receipts</div>;
    }

    return (
      <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
        {receipts.map(({ id, contentHash }) => (
          <Card.Root>
            <Card.Body textAlign="center">
              <Image src={getThumbnailPath(id)} alt={id} objectFit="cover" width="100%" height="150px" bg="gray.100" />
              <Text fontWeight="bold">{contentHash}</Text>
            </Card.Body>
          </Card.Root>
        ))}
      </SimpleGrid>
    );
  };

  return (
    <div>
      <div {...getRootProps()}>
        <input {...getInputProps()} />
        {isDragActive ? <p>Drop the files here ...</p> : <p>Drag 'n' drop some files here, or click to select files</p>}
      </div>
      <div>{renderReceipts()}</div>
    </div>
  );
};

export default ReceiptView;
