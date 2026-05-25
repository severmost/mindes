import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Capacitor требует, чтобы web-ассеты лежали в `dist/` и пути были относительными.
export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: {
          // React — отдельный чанк, кэшируется надолго
          "vendor-react":       ["react", "react-dom"],
          // Firebase разбиваем на части
          "firebase-app":       ["firebase/app"],
          "firebase-auth":      ["firebase/auth"],
          "firebase-firestore": ["firebase/firestore"],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
