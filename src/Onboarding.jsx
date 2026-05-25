// Onboarding — пошаговое обучение новых пользователей.
// Состояние хранится в localStorage; шаги завершаются автоматически
// когда соответствующее действие сделано впервые.
//
// Использование:
//   const ob = useOnboarding();
//   <OnboardingBanner onboarding={ob} theme={theme} />
//   ob.completeStep("create-project");

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Шаги ────────────────────────────────────────────────────────────────────
export const STEPS = [
  {
    id:      "create-project",
    emoji:   "📁",
    title:   "Создайте первый проект",
    sub:     "Нажмите на карточку «Новый проект» ниже",
    arrow:   true,           // показываем стрелку вниз
  },
  {
    id:      "open-project",
    emoji:   "👆",
    title:   "Откройте проект",
    sub:     "Нажмите на карточку проекта",
  },
  {
    id:      "select-node",
    emoji:   "🎯",
    title:   "Нажмите на узел",
    sub:     "Выберите любой узел — справа откроется панель",
  },
  {
    id:      "edit-node",
    emoji:   "✏️",
    title:   "Двойной клик или долгий тап",
    sub:     "Чтобы открыть подробное редактирование задачи",
  },
  {
    id:      "add-child",
    emoji:   "➕",
    title:   "Добавьте подзадачу",
    sub:     "Нажмите «+» в панели справа",
  },
];

const STORAGE_KEY = "mindes_onboarding_v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Новый пользователь — показываем онбординг
  return { completed: [], done: false };
}

function saveState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

// ─── Хук ─────────────────────────────────────────────────────────────────────
export function useOnboarding() {
  const [state, setState] = useState(loadState);

  // Текущий шаг — первый незавершённый
  const currentStep = state.done
    ? null
    : STEPS.find(s => !state.completed.includes(s.id)) ?? null;

  const isActive = !state.done && currentStep !== null;

  const completeStep = useCallback((id) => {
    setState(prev => {
      if (prev.done) return prev;
      if (prev.completed.includes(id)) return prev;
      // Завершаем только если это текущий шаг (или предыдущий был пропущен)
      const stepIdx     = STEPS.findIndex(s => s.id === id);
      const currentIdx  = STEPS.findIndex(s => !prev.completed.includes(s.id));
      if (stepIdx !== currentIdx) return prev;

      const completed = [...prev.completed, id];
      const allDone   = completed.length === STEPS.length;
      const next = { ...prev, completed, done: allDone };
      saveState(next);
      return next;
    });
  }, []);

  const skip = useCallback(() => {
    setState(prev => {
      const next = { ...prev, done: true };
      saveState(next);
      return next;
    });
  }, []);

  const restart = useCallback(() => {
    const next = { completed: [], done: false };
    saveState(next);
    setState(next);
  }, []);

  return { isActive, currentStep, state, completeStep, skip, restart };
}

// ─── Баннер ──────────────────────────────────────────────────────────────────
export function OnboardingBanner({ onboarding, theme }) {
  const { isActive, currentStep, state, completeStep: _, skip } = onboarding;
  const [justFinished, setJustFinished] = useState(false);
  const prevDone = useRef(state.done);

  // Показываем "Отлично!" когда все шаги пройдены
  useEffect(() => {
    if (state.done && !prevDone.current) {
      setJustFinished(true);
      const t = setTimeout(() => setJustFinished(false), 3000);
      return () => clearTimeout(t);
    }
    prevDone.current = state.done;
  }, [state.done]);

  if (justFinished) {
    return (
      <div style={bannerStyle(theme)}>
        <span style={{ fontSize: 22 }}>🎉</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>Отлично! Обучение пройдено</div>
          <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>Вы можете вернуться к нему через меню</div>
        </div>
      </div>
    );
  }

  if (!isActive || !currentStep) return null;

  const stepIdx   = STEPS.findIndex(s => s.id === currentStep.id);
  const total     = STEPS.length;

  return (
    <>
      <div style={bannerStyle(theme)}>
        {/* Шаг */}
        <div style={{ flexShrink: 0, textAlign: "center", minWidth: 28 }}>
          <span style={{ fontSize: 20 }}>{currentStep.emoji}</span>
        </div>

        {/* Текст */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>
              {currentStep.title}
            </span>
            <span style={{ fontSize: 11, color: theme.textMuted, flexShrink: 0 }}>
              {stepIdx + 1} / {total}
            </span>
          </div>
          <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.4 }}>
            {currentStep.sub}
          </div>
        </div>

        {/* Пропустить */}
        <button onClick={skip} style={{
          background: "none", border: "none", cursor: "pointer",
          color: theme.textMuted, fontSize: 12, padding: "4px 0 4px 8px",
          flexShrink: 0, fontFamily: "'Inter', sans-serif",
          textDecoration: "underline", textUnderlineOffset: 2,
        }}>
          Пропустить
        </button>
      </div>

      {/* Прогресс-точки */}
      <div style={{
        position: "fixed", bottom: 76, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 5, zIndex: 29,
      }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{
            width: i === stepIdx ? 18 : 6,
            height: 6, borderRadius: 3,
            background: state.completed.includes(s.id)
              ? "#5b3fc4"
              : i === stepIdx
                ? "#5b3fc480"
                : theme.surfaceBorder,
            transition: "all .25s ease",
          }} />
        ))}
      </div>

      {/* Стрелка вниз для шага create-project */}
      {currentStep.arrow && (
        <div style={{
          position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)",
          zIndex: 29, animation: "arrowBounce 1.4s ease-in-out infinite",
          pointerEvents: "none",
        }}>
          <svg width="22" height="36" viewBox="0 0 22 36" fill="none">
            <path d="M11 2 L11 28" stroke={theme.text} strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
            <path d="M3 20 L11 30 L19 20" stroke={theme.text} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
          </svg>
        </div>
      )}

      <style>{`
        @keyframes arrowBounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(7px); }
        }
      `}</style>
    </>
  );
}

// ─── Стиль баннера ────────────────────────────────────────────────────────────
function bannerStyle(theme) {
  return {
    position: "fixed", bottom: 20, left: "50%",
    transform: "translateX(-50%)",
    zIndex: 30,
    background: theme.panelBg,
    border: `1px solid ${theme.surfaceBorder}`,
    borderRadius: 16,
    padding: "14px 18px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
    display: "flex", alignItems: "center", gap: 12,
    maxWidth: 380, width: "calc(100vw - 32px)",
    animation: "overlaySlideUp .25s ease",
    boxSizing: "border-box",
  };
}

// ─── Пустой экран (когда нет проектов и онбординг не активен) ────────────────
export function EmptyHomeHint({ theme }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "48px 24px 16px", gap: 14,
      animation: "fadeIn .4s ease",
    }}>
      <svg width="64" height="64" viewBox="0 0 72 72" fill="none" style={{ opacity: 0.18 }}>
        <circle cx="36" cy="36" r="28" stroke={theme.text} strokeWidth="2.5" strokeDasharray="5 4"/>
        <circle cx="36" cy="36" r="6" fill={theme.text}/>
        <line x1="36" y1="14" x2="36" y2="22" stroke={theme.text} strokeWidth="2" strokeLinecap="round"/>
        <line x1="36" y1="50" x2="36" y2="58" stroke={theme.text} strokeWidth="2" strokeLinecap="round"/>
        <line x1="14" y1="36" x2="22" y2="36" stroke={theme.text} strokeWidth="2" strokeLinecap="round"/>
        <line x1="50" y1="36" x2="58" y2="36" stroke={theme.text} strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 5 }}>Нет проектов</div>
        <div style={{ fontSize: 13, color: theme.textMuted, maxWidth: 240, lineHeight: 1.5 }}>
          Создайте первый проект, чтобы начать
        </div>
      </div>
    </div>
  );
}
