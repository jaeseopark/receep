import { useCallback, useEffect } from "preact/hooks";
import { useDropzone } from "react-dropzone";
import { getStuff, uploadReceipt } from "@/api";

const ReceiptView = () => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log(acceptedFiles);
    Promise.allSettled(uploadReceipt(acceptedFiles)).then((results) => {
      results.forEach((result) => {
        console.log(result.status);
      })
    })
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  useEffect(() => {
    getStuff().then((stuff) => {
      console.log(stuff);
    })
  }, []);

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      {isDragActive ? <p>Drop the files here ...</p> : <p>Drag 'n' drop some files here, or click to select files</p>}
    </div>
  );
};

export default ReceiptView;
