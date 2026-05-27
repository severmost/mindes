// BackgroundPanel — панель выбора фона по URL.
// Bottom-sheet на мобайле, centered modal на десктопе.

import { useState } from "react";
import { saveBgUrl, clearBg } from "./background";
import { BRAND_COLOR } from "./utils";
import { useLocale } from "./i18n.jsx";

export default function BackgroundPanel({ theme, uid, bgUrl, isMobile, onClose }) {
  const { t } = useLocale();
  const [urlInput,  setUrlInput]  = useState(bgUrl || "");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState(null);

  const wrap = async (fn) => {
    setError(null);
    setSaving(true);
    try { await fn(); onClose(); }
    catch (e) { setError(e.message || t("common.error")); }
    finally   { setSaving(false); }
  };

  const handleApply = () => {
    const url = urlInput.trim();
    if (!url) return;
    wrap(() => saveBgUrl(uid, url));
  };

  const handleClear = () => wrap(() => clearBg(uid));

  const sheetStyle = isMobile ? {
    position: "fixed",
    bottom: 0, left: 0, right: 0,
    zIndex: 210,
    background: theme.panelBg,
    borderRadius: "20px 20px 0 0",
    paddingBottom: "env(safe-area-inset-bottom)",
    boxShadow: "0 -6px 32px rgba(0,0,0,0.28)",
    animation: "overlaySlideUp .2s ease",
  } : {
    position: "fixed",
    top: "50%", left: "50%",
    transform: "translate(-50%,-50%)",
    zIndex: 210,
    background: theme.panelBg,
    borderRadius: 20,
    width: 440,
    boxShadow: "0 8px 48px rgba(0,0,0,0.38)",
    animation: "overlaySlideUp .2s ease",
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 209,
        background: "rgba(0,0,0,0.52)",
        animation: "fadeIn .15s ease",
      }} />

      <div style={sheetStyle}>
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 4px" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: theme.surfaceBorder }} />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "14px 20px 10px" : "18px 22px 10px" }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: theme.text }}>{t("bg.title")}</span>
          {!isMobile && (
            <button onClick={onClose} style={{ background: "none", border: "none", color: theme.textMuted, fontSize: 24, cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>×</button>
          )}
        </div>

        <div style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Превью */}
          {bgUrl && (
            <div style={{
              width: "100%", height: 110, borderRadius: 12,
              backgroundImage: `url(${bgUrl})`,
              backgroundSize: "cover", backgroundPosition: "center",
              border: `1px solid ${theme.surfaceBorder}`,
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.18)" }} />
              <div style={{
                position: "absolute", bottom: 8, left: 10,
                fontSize: 11, color: "#fff",
                background: "rgba(0,0,0,0.45)", borderRadius: 6,
                padding: "2px 7px",
              }}>
                {t("bg.current")}
              </div>
            </div>
          )}

          {/* URL */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, color: theme.textMuted, fontWeight: 500, letterSpacing: "0.03em" }}>
              {t("bg.linkLabel")}
            </label>
            <input
              type="url"
              placeholder={t("bg.placeholder")}
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleApply()}
              style={{
                width: "100%", padding: "11px 13px", borderRadius: 10,
                border: `1.5px solid ${theme.surfaceBorder}`,
                background: theme.surfaceBg, color: theme.text,
                fontSize: 14, outline: "none",
                fontFamily: "'Inter', sans-serif",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={handleApply}
              disabled={saving || !urlInput.trim()}
              style={{
                padding: "11px 0", borderRadius: 10,
                background: BRAND_COLOR, color: "#fff", border: "none",
                fontSize: 14, cursor: "pointer", fontWeight: 600,
                opacity: (!urlInput.trim() || saving) ? 0.45 : 1,
                transition: "opacity .15s",
              }}
            >
              {saving ? t("bg.saving") : t("bg.apply")}
            </button>
          </div>

          {/* Ошибка */}
          {error && (
            <div style={{
              fontSize: 13, color: "#F44336",
              background: "#F4433614", border: "1px solid #F4433630",
              padding: "9px 12px", borderRadius: 9,
            }}>
              {error}
            </div>
          )}

          {/* Убрать фон */}
          {bgUrl && (
            <>
              <div style={{ height: 1, background: theme.surfaceBorderSoft }} />
              <button
                onClick={handleClear}
                disabled={saving}
                style={{
                  padding: "11px 0", borderRadius: 10,
                  background: "transparent", color: "#F44336",
                  border: `1.5px solid #F4433640`,
                  fontSize: 14, cursor: "pointer", fontWeight: 500,
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {t("bg.remove")}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
