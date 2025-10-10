import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "fs";

const packageJson = JSON.parse(readFileSync("./package.json", "utf8"));

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8083,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Exponer la versión del paquete a la aplicación
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
  },
}));