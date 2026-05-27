// Shared UI primitives used across Mindmap and ProjectsHome.
// Keeps the two main views in sync without copy-pasting components.

import { useState, useRef } from "react";
import BrandLogo from "./BrandLogo";
import { useLocale, LANGS } from "./i18n.jsx";
import { PRIORITY_COLORS, BRAND_COLOR } from "./utils";

// ── Icons ────────────────────────────────────────────────────────────────────
export function SunIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>
  );
}
export function MoonIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}
export function ShareIcon({ size = 14 }) {
  return (
    <svg style={{ display: "inline", verticalAlign: "middle", marginBottom: 1 }}
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
      <polyline points="16 6 12 2 8 6"/>
      <line x1="12" y1="2" x2="12" y2="15"/>
    </svg>
  );
}

// ── Shared UI atoms ───────────────────────────────────────────────────────────

/** Цветная точка приоритета. Возвращает null если priority не задан. */
export function PriorityDot({ priority, size = 8 }) {
  if (!priority || !PRIORITY_COLORS[priority]) return null;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: PRIORITY_COLORS[priority].bg, flexShrink: 0 }} />
  );
}

/**
 * Горизонтальный прогресс-бар.
 * pct — 0..100, color — цвет заливки, trackColor — цвет фона, style — доп. стили контейнера.
 */
export function ProgressBar({ pct, color, trackColor, height = 4, style }) {
  const radius = Math.ceil(height / 2);
  return (
    <div style={{ height, borderRadius: radius, background: trackColor, overflow: "hidden", ...style }}>
      <div style={{ height: "100%", width: `${pct}%`, borderRadius: "inherit", background: color, transition: "width .5s" }} />
    </div>
  );
}

// ── Glass style ──────────────────────────────────────────────────────────────
// Жидкое стекло: backdrop-blur + полупрозрачный фон + тонкая белая рамка.
// themeName — "dark" | "light"
export function glassStyle(themeName) {
  if (themeName === "dark") return {
    background:           "rgba(15, 14, 35, 0.55)",
    backdropFilter:       "blur(22px) saturate(160%)",
    WebkitBackdropFilter: "blur(22px) saturate(160%)",
    border:               "1px solid rgba(255,255,255,0.09)",
    boxShadow:            "0 8px 32px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
  return {
    background:           "rgba(255, 255, 255, 0.60)",
    backdropFilter:       "blur(22px) saturate(180%)",
    WebkitBackdropFilter: "blur(22px) saturate(180%)",
    border:               "1px solid rgba(255,255,255,0.88)",
    boxShadow:            "0 8px 32px rgba(80,60,140,0.10), inset 0 1px 0 rgba(255,255,255,0.95)",
  };
}

// ── AppOverlay ───────────────────────────────────────────────────────────────
// Full-screen overlay with swipe-down-to-close, animated slide-up entrance.
// Replaces OverlayList (Mindmap) and HomeOverlay (ProjectsHome).
export function AppOverlay({ title, children, theme, themeName, onClose, zIndex = 50, bgUrl }) {
  const touchStartY = useRef(0);
  return (
    <div
      onTouchStart={e => { touchStartY.current = e.touches[0].clientY; }}
      onTouchEnd={e => { if (e.changedTouches[0].clientY - touchStartY.current > 80) onClose(); }}
      style={{
        position: "fixed", inset: 0,
        paddingTop: "env(safe-area-inset-top)",
        background: bgUrl
          ? (themeName === "dark"
              ? `linear-gradient(rgba(10,10,20,0.72),rgba(10,10,20,0.72)) center/cover, url(${bgUrl}) center/cover no-repeat`
              : `linear-gradient(rgba(238,242,255,0.72),rgba(238,242,255,0.72)) center/cover, url(${bgUrl}) center/cover no-repeat`)
          : theme.appBg,
        color: theme.text,
        zIndex,
        display: "flex", flexDirection: "column",
        fontFamily: "'Inter', sans-serif",
        animation: "overlaySlideUp .2s ease",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 24px",
        borderBottom: `1px solid ${theme.surfaceBorderSoft}`,
        flexShrink: 0,
      }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{title}</h2>
        <button onClick={onClose}
          style={{ background: "none", border: "none", color: theme.textMuted, fontSize: 26, cursor: "pointer", lineHeight: 1, padding: "4px 10px" }}>
          ×
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", maxWidth: 700, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {children}
      </div>
    </div>
  );
}

// ── AppMenu ──────────────────────────────────────────────────────────────────
// Dropdown menu rendered inside a position:relative container.
// Pass user to show the email header at the top.
export function AppMenu({ theme, themeName, onToggleTheme, onSignOut,
  onToday, onArchive, onOpenBgPanel, onOnboarding, onClose, user }) {
  const { t, locale, setLocale } = useLocale();
  const [langOpen, setLangOpen] = useState(false);

  return (
    <div
      style={{
        position: "absolute", top: 50, right: 0, zIndex: 40,
        ...glassStyle(themeName),
        borderRadius: 14, padding: "8px 0", minWidth: 210,
        animation: "menuIn .18s ease",
      }}
      onClick={e => e.stopPropagation()}
    >
      {user?.email && (
        <div style={{
          fontSize: 12, color: theme.textDim,
          padding: "4px 16px 8px",
          borderBottom: `1px solid ${theme.surfaceBorder}`,
          marginBottom: 4, wordBreak: "break-all",
        }}>
          {user.email}
        </div>
      )}
      <div className="menu-item" onClick={() => { onToday?.();       onClose(); }}>{t("menu.today")}</div>
      <div className="menu-item" onClick={() => { onArchive?.();     onClose(); }}>{t("menu.archive")}</div>
      <div className="menu-item" onClick={() => { onOpenBgPanel?.(); onClose(); }}>{t("menu.background")}</div>
      <div className="menu-item" onClick={() => { onOnboarding?.();  onClose(); }}>{t("menu.training")}</div>

      {/* Language selector */}
      <div className="menu-item"
        onClick={() => setLangOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>{t("menu.language")}</span>
        <span style={{ fontSize: 13, color: theme.textMuted }}>
          {LANGS[locale]?.flag} {LANGS[locale]?.name}
        </span>
      </div>
      {langOpen && (
        <div style={{ paddingLeft: 16, paddingBottom: 4 }}>
          {Object.entries(LANGS).map(([code, info]) => (
            <div key={code}
              onClick={() => { setLocale(code); setLangOpen(false); onClose(); }}
              style={{
                padding: "7px 16px 7px 0",
                fontSize: 13,
                cursor: "pointer",
                color: code === locale ? "#7c5fe6" : theme.text,
                fontWeight: code === locale ? 700 : 400,
                display: "flex", alignItems: "center", gap: 8,
              }}
              className="menu-item-inner">
              <span>{info.flag}</span>
              <span>{info.name}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 1, background: theme.surfaceBorderSoft, margin: "4px 0" }} />
      <div className="menu-item"
        onClick={() => { onToggleTheme(); onClose(); }}
        style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ display: "inline-flex", color: theme.btnText }}>
          {themeName === "dark" ? <SunIcon size={15} /> : <MoonIcon size={15} />}
        </span>
        {themeName === "dark" ? t("menu.lightTheme") : t("menu.darkTheme")}
      </div>
      <div style={{ height: 1, background: theme.surfaceBorderSoft, margin: "4px 0" }} />
      <div className="menu-item-danger"
        onClick={() => { onSignOut(); onClose(); }}
        style={{ color: "#F44336" }}>
        {t("menu.signOut")}
      </div>
    </div>
  );
}

// ── AppHeader ────────────────────────────────────────────────────────────────
// Top navigation bar shared by Mindmap and ProjectsHome.
//
// Props:
//   sticky    — adds position:sticky + blur backdrop (ProjectsHome mode)
//   mapName   — show "› color-dot name" breadcrumb after logo (Mindmap mode)
//   mapColor  — accent color for the breadcrumb dot
//   user      — enables the burger menu; user.email shows in dropdown header
export function AppHeader({ theme, themeName, onToggleTheme, onSignOut, onGoHome,
  onToday, onArchive, onOpenBgPanel, onOnboarding, user,
  mapName, mapColor,
  sticky = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <div
      style={{
        height: 56,
        paddingLeft: 16, paddingRight: 16,
        display: "flex", alignItems: "center", gap: 10,
        ...(sticky ? {
          paddingTop: "env(safe-area-inset-top)",
          position: "sticky", top: 0, zIndex: 10,
          justifyContent: "space-between",
          background: "transparent",
          boxSizing: "content-box",
        } : {
          flexShrink: 0,
          background: "transparent",
          zIndex: 15,
        }),
      }}
      onClick={() => menuOpen && close()}
    >
      {/* Left: logo + optional breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        <BrandLogo size={sticky ? 32 : 28} fontSize={sticky ? 17 : 15} onClick={onGoHome} />
        {mapName && (
          <>
            <span style={{ color: theme.surfaceBorder, fontSize: 16, flexShrink: 0 }}>›</span>
            {mapColor && (
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: mapColor, flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {mapName}
            </span>
          </>
        )}
      </div>

      {/* Right: burger + dropdown */}
      {user && (
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 6,
              display: "flex", flexDirection: "column", gap: 5.5 }}
          >
            <div style={{ width: 24, height: 4, borderRadius: 2, background: BRAND_COLOR, transition: "transform .25s", transformOrigin: "center", transform: menuOpen ? "translateY(9.5px) rotate(45deg)" : "none" }} />
            <div style={{ width: 24, height: 4, borderRadius: 2, background: BRAND_COLOR, transition: "opacity .2s", opacity: menuOpen ? 0 : 1 }} />
            <div style={{ width: 24, height: 4, borderRadius: 2, background: BRAND_COLOR, transition: "transform .25s", transformOrigin: "center", transform: menuOpen ? "translateY(-9.5px) rotate(-45deg)" : "none" }} />
          </button>
          {menuOpen && (
            <AppMenu
              theme={theme} themeName={themeName}
              onToggleTheme={onToggleTheme} onSignOut={onSignOut}
              onToday={onToday} onArchive={onArchive}
              onOpenBgPanel={onOpenBgPanel}
              onOnboarding={onOnboarding}
              user={user}
              onClose={close}
            />
          )}
        </div>
      )}
    </div>
  );
}
