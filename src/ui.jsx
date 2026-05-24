// Shared UI primitives used across Mindmap and ProjectsHome.
// Keeps the two main views in sync without copy-pasting components.

import { useState, useRef } from "react";
import BrandLogo from "./BrandLogo";

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

// ── AppOverlay ───────────────────────────────────────────────────────────────
// Full-screen overlay with swipe-down-to-close, animated slide-up entrance.
// Replaces OverlayList (Mindmap) and HomeOverlay (ProjectsHome).
export function AppOverlay({ title, children, theme, onClose, zIndex = 50 }) {
  const touchStartY = useRef(0);
  return (
    <div
      onTouchStart={e => { touchStartY.current = e.touches[0].clientY; }}
      onTouchEnd={e => { if (e.changedTouches[0].clientY - touchStartY.current > 80) onClose(); }}
      style={{
        position: "fixed", inset: 0,
        paddingTop: "env(safe-area-inset-top)",
        background: theme.appBg, color: theme.text,
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
  onToday, onArchive, onOpenBgPanel, onClose, user }) {
  return (
    <div
      style={{
        position: "absolute", top: 50, right: 0, zIndex: 40,
        background: theme.panelBg,
        border: `1px solid ${theme.surfaceBorder}`,
        borderRadius: 14, padding: "8px 0", minWidth: 190,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
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
      <div className="menu-item" onClick={() => { onToday?.();       onClose(); }}>Сегодня</div>
      <div className="menu-item" onClick={() => { onArchive?.();     onClose(); }}>Архив</div>
      <div className="menu-item" onClick={() => { onOpenBgPanel?.(); onClose(); }}>Фон</div>
      <div style={{ height: 1, background: theme.surfaceBorderSoft, margin: "4px 0" }} />
      <div className="menu-item"
        onClick={() => { onToggleTheme(); onClose(); }}
        style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ display: "inline-flex", color: theme.btnText }}>
          {themeName === "dark" ? <SunIcon size={15} /> : <MoonIcon size={15} />}
        </span>
        {themeName === "dark" ? "Светлая тема" : "Тёмная тема"}
      </div>
      <div style={{ height: 1, background: theme.surfaceBorderSoft, margin: "4px 0" }} />
      <div className="menu-item-danger"
        onClick={() => { onSignOut(); onClose(); }}
        style={{ color: "#F44336" }}>
        Выйти
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
  onToday, onArchive, onOpenBgPanel, user,
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
            <div style={{ width: 24, height: 4, borderRadius: 2, background: "#5b3fc4", transition: "transform .25s", transformOrigin: "center", transform: menuOpen ? "translateY(9.5px) rotate(45deg)" : "none" }} />
            <div style={{ width: 24, height: 4, borderRadius: 2, background: "#5b3fc4", transition: "opacity .2s", opacity: menuOpen ? 0 : 1 }} />
            <div style={{ width: 24, height: 4, borderRadius: 2, background: "#5b3fc4", transition: "transform .25s", transformOrigin: "center", transform: menuOpen ? "translateY(-9.5px) rotate(-45deg)" : "none" }} />
          </button>
          {menuOpen && (
            <AppMenu
              theme={theme} themeName={themeName}
              onToggleTheme={onToggleTheme} onSignOut={onSignOut}
              onToday={onToday} onArchive={onArchive}
              onOpenBgPanel={onOpenBgPanel}
              user={user}
              onClose={close}
            />
          )}
        </div>
      )}
    </div>
  );
}
