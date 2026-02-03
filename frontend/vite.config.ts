import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite configuration for React development. It sets up the React plugin
// and configures the dev server port to 5173.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 }
});