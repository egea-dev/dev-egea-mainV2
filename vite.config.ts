import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "fs";
import basicSsl from '@vitejs/plugin-basic-ssl';

const packageJson = JSON.parse(readFileSync("./package.json", "utf8"));

export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8083,
    https: true, // HTTPS necesario para usar cámara (getUserMedia)
  },
  // basicSsl() para desarrollo con HTTPS
  plugins: [react(), basicSsl()],
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