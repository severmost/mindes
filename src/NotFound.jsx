import { useLocale } from "./i18n.jsx";
import { BRAND_COLOR } from "./utils";

export default function NotFound({ theme, onGoHome }) {
  const { t } = useLocale();
  return (
    <div style={{
      width: "100%", height: "100vh",
      background: theme.appBg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      color: theme.text,
      gap: 12,
      padding: 24,
      boxSizing: "border-box",
      animation: "pageIn .2s ease",
    }}>
      <div style={{ fontSize: 72, fontWeight: 900, color: theme.surfaceBorder, lineHeight: 1 }}>
        404
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginTop: 4 }}>
        {t("notfound.title")}
      </div>
      <div style={{ fontSize: 14, color: theme.textMuted, textAlign: "center", maxWidth: 280 }}>
        {t("notfound.subtitle")}
      </div>
      <button
        onClick={onGoHome}
        style={{
          marginTop: 16,
          padding: "12px 28px",
          borderRadius: 14,
          border: "none",
          background: BRAND_COLOR,
          color: "#fff",
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "'Inter', sans-serif",
          transition: "opacity .15s",
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
      >
        {t("notfound.goHome")}
      </button>
    </div>
  );
}
