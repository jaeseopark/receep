import preact from "@preact/preset-vite";
import { defineConfig } from "vite";
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 80,
    allowedHosts: ["ui"],
  }
});
