import { ChakraProvider } from "@chakra-ui/react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ReceiptView from "./components/ReceiptView";

import "./app.css";

export const App = () => {
  return (
    <ChakraProvider>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/" element={<ReceiptView />} />
        </Routes>
      </BrowserRouter>
    </ChakraProvider>
  );
};
