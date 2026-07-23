import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") ||
              id.includes("node_modules/react-dom") ||
              id.includes("node_modules/react-router-dom")) {
            return "vendor";
          }
          if (id.includes("node_modules/ethers")) {
            return "ethers";
          }
          if (id.includes("/src/engine/")) {
            return "engine";
          }
          if (id.includes("/src/data/")) {
            return "data";
          }
        },
      },
    },
  },
});