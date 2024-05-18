import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
  server: {
    host: "0.0.0.0",
    port: 80,
  },
  resolve: {
    alias: {
      react: "preact-compat",
      "react-dom": "preact-compat",
    },
  },
});
