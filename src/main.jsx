import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { LocaleProvider } from "./i18n.jsx";

// Service Worker — только для веба (не в Capacitor native)
if ("serviceWorker" in navigator && !window.Capacitor?.isNativePlatform?.()) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// Capacitor Android — аппаратная кнопка «Назад» (эмулирует history.back)
if (window.Capacitor?.isNativePlatform?.()) {
  import("@capacitor/app").then(({ App: CapApp }) => {
    CapApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        history.back();
      } else {
        // Закрываем приложение если уже на корне
        CapApp.exitApp();
      }
    });
  }).catch(() => {});
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LocaleProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </LocaleProvider>
  </StrictMode>
);
