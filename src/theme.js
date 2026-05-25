// Палитры тёмной и светлой темы + хук с persistence в localStorage.
// Хук читает сохранённое значение, иначе подхватывает системную prefers-color-scheme.

import { useEffect, useState } from "react";

export const themes = {
  dark: {
    name: "dark",
    appBg: "linear-gradient(135deg,#0c0c18,#151528,#12203a)",
    panelBg: "#111119",
    panelBorder: "#1e1e2e",
    panelTabBg: "linear-gradient(180deg, #0a0a14 0%, transparent 100%)",
    surfaceBg: "#1a1a28",
    surfaceBgHover: "#1e1e3a",
    surfaceBorder: "#2a2a3a",
    surfaceBorderSoft: "#1e1e2e",
    inputBg: "#1a1a28",
    inputBorder: "#2a2a3a",
    btnBg: "#151528",
    btnText: "#aaa",
    btnTextDim: "#666",
    tabActiveBg: "#1a1a2e",
    tabActiveText: "#eee",
    tabInactiveText: "#666",
    tabStatsActive: "#888",
    tabStatsInactive: "#444",
    text: "#ddd",
    textDim: "#888",
    textMuted: "#555",
    textHint: "#333",
    textFaint: "#444",
    nodeFill: "#1a1b2e",
    nodeDoneFill: "#1e1e2e",
    nodeDoneStroke: "#444",
    nodeDoneText: "#666",
    gridDot: "#ffffff08",
    lineDone: "#333",
    avatarBg: "#151528",
    sectionLabel: "#555",
    progressTrack: "#1e1e2e",
    deleteBg: "#FF525210",
    deleteBorder: "#FF525230",
    loginCardBg: "rgba(20,20,40,0.6)",
    loginCardBorder: "#2a2a3a",
    loginPrimaryBtnBg: "#fff",
    loginPrimaryBtnText: "#1a1a28",
  },
  light: {
    name: "light",
    appBg: "linear-gradient(145deg, #eef2ff 0%, #ebe5ff 55%, #f3e8ff 100%)",
    panelBg: "#f4f7ff",
    panelBorder: "#dde2f0",
    panelTabBg: "linear-gradient(180deg, #e8edff 0%, transparent 100%)",
    surfaceBg: "#ffffff",
    surfaceBgHover: "#edf1ff",
    surfaceBorder: "#dde2ec",
    surfaceBorderSoft: "#eaedfa",
    inputBg: "#f5f7fb",
    inputBorder: "#d8dde7",
    btnBg: "#ffffff",
    btnText: "#5a6076",
    btnTextDim: "#a6acc0",
    tabActiveBg: "#ffffff",
    tabActiveText: "#1a1a28",
    tabInactiveText: "#7d8499",
    tabStatsActive: "#5a6076",
    tabStatsInactive: "#a6acc0",
    text: "#1a1a28",
    textDim: "#5a6076",
    textMuted: "#7d8499",
    textHint: "#a6acc0",
    textFaint: "#a6acc0",
    nodeFill: "#ffffff",
    nodeDoneFill: "#edf1ff",
    nodeDoneStroke: "#c0c5d3",
    nodeDoneText: "#7d8499",
    gridDot: "#0a0a1a10",
    lineDone: "#c0c5d3",
    avatarBg: "#eaedff",
    sectionLabel: "#7d8499",
    progressTrack: "#e5e9f8",
    deleteBg: "#FF525210",
    deleteBorder: "#FF525230",
    loginCardBg: "rgba(244,247,255,0.92)",
    loginCardBorder: "#d8ddf2",
    loginPrimaryBtnBg: "#1a1a28",
    loginPrimaryBtnText: "#ffffff",
  },
};

const STORAGE_KEY = "mindes_theme";

function getInitialThemeName() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
    if (typeof window !== "undefined" && window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
  } catch {}
  return "dark";
}

/** Записывает все цвета темы как CSS-переменные на :root. */
function applyThemeCssVars(t) {
  const el = document.documentElement;
  el.style.background = t.panelBg;
  document.body.style.background = t.panelBg;
  const vars = {
    "--app-bg":              t.appBg,
    "--panel-bg":            t.panelBg,
    "--panel-tab-bg":        t.panelTabBg,
    "--surface-bg":          t.surfaceBg,
    "--surface-bg-hover":    t.surfaceBgHover,
    "--surface-border":      t.surfaceBorder,
    "--surface-border-soft": t.surfaceBorderSoft,
    "--input-bg":            t.inputBg,
    "--input-border":        t.inputBorder,
    "--btn-bg":              t.btnBg,
    "--btn-text":            t.btnText,
    "--text":                t.text,
    "--text-dim":            t.textDim,
    "--text-muted":          t.textMuted,
    "--text-hint":           t.textHint,
    "--text-faint":          t.textFaint,
    "--section-label":       t.sectionLabel,
    "--progress-track":      t.progressTrack,
    "--delete-bg":              t.deleteBg,
    "--delete-border":          t.deleteBorder,
    "--scrollbar-thumb":        t.name === "dark" ? "rgba(140,120,200,0.28)" : "rgba(100,90,160,0.22)",
    "--scrollbar-thumb-hover":  t.name === "dark" ? "rgba(160,140,220,0.55)" : "rgba(100,90,160,0.45)",
  };
  Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
}

export function useTheme() {
  const [name, setName] = useState(getInitialThemeName);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, name); } catch {}
    applyThemeCssVars(themes[name]);
  }, [name]);

  return {
    theme: themes[name],
    name,
    toggle: () => setName((n) => (n === "dark" ? "light" : "dark")),
    setTheme: setName,
  };
}

/**
 * Возвращает тему с усиленным контрастом приглушённых цветов для случая,
 * когда активен фон-оверлей.
 *
 * Тёмная тема: оверлей затемняет → dim-цвета делаем светлее.
 * Светлая тема: оверлей засветляет → dim-цвета делаем темнее.
 */
export function boostTheme(t) {
  if (t.name === "dark") {
    return {
      ...t,
      textDim:      "#ccc",
      textMuted:    "#aaa",
      textHint:     "#777",
      textFaint:    "#888",
      sectionLabel: "#999",
      btnTextDim:   "#999",
    };
  } else {
    return {
      ...t,
      textDim:      "#2a3040",
      textMuted:    "#464e68",
      textHint:     "#6a7090",
      textFaint:    "#6a7090",
      sectionLabel: "#464e68",
      btnTextDim:   "#6a7090",
    };
  }
}

const SHAPE_KEY = "mindes_shape";
export function useNodeShape() {
  const [shape, setShape] = useState(() => {
    try {
      const v = localStorage.getItem(SHAPE_KEY);
      return v === "rect" ? "rect" : "circle";
    } catch { return "circle"; }
  });
  useEffect(() => {
    try { localStorage.setItem(SHAPE_KEY, shape); } catch {}
  }, [shape]);
  return {
    shape,
    toggle: () => setShape((s) => (s === "circle" ? "rect" : "circle")),
    setShape,
  };
}
