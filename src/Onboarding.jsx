// Onboarding hints — контекстные подсказки при первом столкновении с функцией.
// Каждая показывается ровно 1 раз, флаг хранится в localStorage.

import { useState, useEffect } from "react";

const KEY_MINDMAP = "mindes_hint_mindmap_v1";
const KEY_CHILD   = "mindes_hint_child_v1";

// ─────────────────────────────────────────────────────────────────────────────
// Пустой экран ProjectsHome — стрелка указывает на «Новый проект»
// ─────────────────────────────────────────────────────────────────────────────
export function EmptyHomeHint({ theme }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "48px 24px", gap: 16,
      animation: "fadeIn .4s ease",
    }}>
      {/* Иллюстрация */}
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{ opacity: 0.22 }}>
        <circle cx="36" cy="36" r="28" stroke={theme.text} strokeWidth="2.5" strokeDasharray="5 4"/>
        <circle cx="36" cy="36" r="6"  fill={theme.text}/>
        <line x1="36" y1="14" x2="36" y2="22" stroke={theme.text} strokeWidth="2" strokeLinecap="round"/>
        <line x1="36" y1="50" x2="36" y2="58" stroke={theme.text} strokeWidth="2" strokeLinecap="round"/>
        <line x1="14" y1="36" x2="22" y2="36" stroke={theme.text} strokeWidth="2" strokeLinecap="round"/>
        <line x1="50" y1="36" x2="58" y2="36" stroke={theme.text} strokeWidth="2" strokeLinecap="round"/>
      </svg>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: theme.text, marginBottom: 6 }}>
          Нет проектов
        </div>
        <div style={{ fontSize: 14, color: theme.textMuted, maxWidth: 260, lineHeight: 1.5 }}>
          Создайте первый проект, чтобы начать работу с задачами
        </div>
      </div>

      {/* Стрелка вниз, указывает на карточку «+» */}
      <svg width="24" height="40" viewBox="0 0 24 40" fill="none"
        style={{ opacity: 0.35, animation: "arrowBounce 1.6s ease-in-out infinite" }}>
        <path d="M12 2 L12 32" stroke={theme.text} strokeWidth="2" strokeLinecap="round"/>
        <path d="M4 24 L12 34 L20 24" stroke={theme.text} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>

      <style>{`
        @keyframes arrowBounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(6px); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Баннер в миндмапе — двойной клик / долгий тап для редактирования
// ─────────────────────────────────────────────────────────────────────────────
export function MindmapHint({ theme }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Показываем только если не видели раньше
    try {
      if (!localStorage.getItem(KEY_MINDMAP)) setVisible(true);
    } catch { setVisible(true); }

    // Автоскрытие через 6 сек
    const t = setTimeout(() => dismiss(), 6000);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(KEY_MINDMAP, "1"); } catch {}
  }

  if (!visible) return null;

  return (
    <div
      onClick={dismiss}
      style={{
        position: "absolute", bottom: 24, left: "50%",
        transform: "translateX(-50%)",
        zIndex: 30,
        background: theme.panelBg,
        border: `1px solid ${theme.surfaceBorder}`,
        borderRadius: 16,
        padding: "14px 20px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
        display: "flex", alignItems: "center", gap: 14,
        maxWidth: 340, width: "calc(100vw - 48px)",
        animation: "overlaySlideUp .25s ease",
        cursor: "pointer",
      }}
    >
      {/* Иконка жеста */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <TapIcon color={theme.text} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 3 }}>
          Открыть задачу
        </div>
        <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.5 }}>
          Двойной клик или долгий тап — чтобы редактировать узел
        </div>
      </div>

      {/* Прогресс-бар автоскрытия */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
        borderRadius: "0 0 16px 16px", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", background: "#5b3fc4",
          animation: "hintProgress 6s linear forwards",
        }} />
      </div>

      <style>{`
        @keyframes hintProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Подсказка после создания первого узла — как создать дочерний
// ─────────────────────────────────────────────────────────────────────────────
export function ChildNodeHint({ theme }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY_CHILD)) setVisible(true);
    } catch { setVisible(true); }

    const t = setTimeout(() => dismiss(), 5000);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(KEY_CHILD, "1"); } catch {}
  }

  if (!visible) return null;

  return (
    <div
      onClick={dismiss}
      style={{
        position: "absolute", bottom: 24, left: "50%",
        transform: "translateX(-50%)",
        zIndex: 30,
        background: theme.panelBg,
        border: `1px solid ${theme.surfaceBorder}`,
        borderRadius: 16,
        padding: "14px 20px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
        display: "flex", alignItems: "center", gap: 14,
        maxWidth: 340, width: "calc(100vw - 48px)",
        animation: "overlaySlideUp .25s ease",
        cursor: "pointer",
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <PlusNodeIcon color={theme.text} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 3 }}>
          Добавить подзадачу
        </div>
        <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.5 }}>
          Нажмите на узел — кнопка «+» в панели справа создаст дочерний узел
        </div>
      </div>

      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
        borderRadius: "0 0 16px 16px", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", background: "#5b3fc4",
          animation: "hintProgress 5s linear forwards",
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Иконки
// ─────────────────────────────────────────────────────────────────────────────
function TapIcon({ color }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      {/* Палец */}
      <path d="M16 6 C16 6 12 8 12 14 L12 22 C12 24.2 13.8 26 16 26 C18.2 26 20 24.2 20 22 L20 14 C20 8 16 6 16 6Z"
        stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
      {/* Двойной таппинг */}
      <circle cx="24" cy="10" r="2.5" fill={color} opacity="0.5"/>
      <circle cx="27" cy="15" r="1.8" fill={color} opacity="0.3"/>
    </svg>
  );
}

function PlusNodeIcon({ color }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="10" cy="16" r="6" stroke={color} strokeWidth="1.8" opacity="0.7"/>
      <line x1="16" y1="16" x2="22" y2="16" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" opacity="0.5"/>
      <circle cx="26" cy="16" r="4" stroke={color} strokeWidth="1.8" opacity="0.7"/>
      <line x1="24" y1="16" x2="28" y2="16" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="26" y1="14" x2="26" y2="18" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
