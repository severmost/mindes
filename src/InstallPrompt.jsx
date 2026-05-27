// Баннер установки PWA:
// — iOS Safari: показывает инструкцию "Поделиться → На экран Домой"
// — Android / Desktop Chrome: перехватывает beforeinstallprompt → кнопка "Установить"
// — В Capacitor (native) и в standalone-режиме не показывается
// — Запоминает отклонение в localStorage

import { useState, useEffect } from "react";
import { useLocale } from "./i18n.jsx";
import { ShareIcon } from "./ui";
import { BRAND_COLOR } from "./utils";

const STORAGE_KEY = "mindes_install_dismissed";

export default function InstallPrompt({ theme }) {
  const { t } = useLocale();
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState(null);          // "ios" | "chrome"
  const [deferredEvt, setDeferredEvt] = useState(null);

  useEffect(() => {
    // Не показываем в нативном Capacitor
    if (window.Capacitor?.isNativePlatform?.()) return;
    // Уже отклонил
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Уже установлено / открыто как PWA
    const isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) return;

    // iOS Safari (не Chrome/Firefox on iOS)
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isSafariBrowser = /Safari/.test(ua) && !/CriOS|FxiOS|Chrome|EdgiOS/.test(ua);
    if (isIOS && isSafariBrowser) {
      // Небольшая задержка чтобы не мешать первому рендеру
      const installTimeout = setTimeout(() => { setMode("ios"); setShow(true); }, 3000);
      return () => clearTimeout(installTimeout);
    }

    // Android Chrome / Desktop Chrome — beforeinstallprompt
    const handler = e => {
      e.preventDefault();
      setDeferredEvt(e);
      setMode("chrome");
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  };

  const install = async () => {
    if (!deferredEvt) return;
    deferredEvt.prompt();
    const { outcome } = await deferredEvt.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferredEvt(null);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 999,
      background: theme.panelBg,
      borderTop: `1px solid ${theme.surfaceBorder}`,
      padding: "14px 16px",
      paddingBottom: "calc(28px + env(safe-area-inset-bottom))",
      fontFamily: "'Inter', sans-serif",
      boxShadow: "0 -4px 24px rgba(0,0,0,0.18)",
      animation: "slideUp .3s ease",
    }}>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); opacity:0 } to { transform: translateY(0); opacity:1 } }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 14, maxWidth: 480, margin: "0 auto" }}>
        <img src="/icon.svg" alt="Mindes" style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: BRAND_COLOR,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: theme.text, marginBottom: 3 }}>
            {t("install.title")}
          </div>
          {mode === "ios" ? (
            <div style={{ fontSize: 13, color: theme.textDim, lineHeight: 1.5 }}>
              Нажмите{" "}
              <span style={{ fontWeight: 600, color: theme.text }}>
                Поделиться <ShareIcon />
              </span>{" "}
              → <span style={{ fontWeight: 600, color: theme.text }}>{t("install.iosHint")}</span>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: theme.textDim, lineHeight: 1.5 }}>
              {t("install.chromeHint")}
            </div>
          )}
        </div>
        {mode === "chrome" && (
          <button onClick={install} style={{
            flexShrink: 0, padding: "9px 16px",
            borderRadius: 10, border: "none",
            background: BRAND_COLOR, color: "#fff",
            fontFamily: "'Inter'", fontWeight: 700, fontSize: 13,
            cursor: "pointer", whiteSpace: "nowrap",
          }}>{t("install.button")}</button>
        )}
        <button onClick={dismiss} style={{
          flexShrink: 0, background: "none", border: "none",
          color: theme.textMuted, fontSize: 22, cursor: "pointer",
          lineHeight: 1, padding: "0 2px", alignSelf: "flex-start",
        }}>×</button>
      </div>
    </div>
  );
}

