import { defineConfig } from "vite";
import type { UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const config = {
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    globals: true,
  },
} satisfies UserConfig & {
  test: {
    environment: "jsdom";
    setupFiles: string;
    css: boolean;
    globals: boolean;
  };
};

export default defineConfig(config);
