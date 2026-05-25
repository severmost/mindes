// Onboarding — пошаговое обучение новых пользователей.
// Состояние хранится в localStorage; шаги завершаются автоматически
// когда соответствующее действие сделано впервые.

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";

// ─── Шаги ────────────────────────────────────────────────────────────────────
// target: CSS-селектор элемента, к которому рисуется стрелка
export const STEPS = [
  {
    id:     "create-project",
    emoji:  "📁",
    title:  "Создайте первый проект",
    sub:    "Нажмите на карточку «+»",
    target: "[data-ob='add-card']",
  },
  {
    id:     "edit-project",
    emoji:  "✏️",
    title:  "Двойной клик или долгий тап",
    sub:    "На карточке проекта — для редактирования",
    target: "[data-ob='project-card']",
  },
  {
    id:     "open-project",
    emoji:  "👆",
    title:  "Откройте проект",
    sub:    "Одиночный клик / тап на карточке",
    target: "[data-ob='project-card']",
  },
  {
    id:     "select-node",
    emoji:  "🎯",
    title:  "Нажмите на узел",
    sub:    "Откроется окно с деталями задачи",
    target: "[data-ob='center-node']",
  },
  {
    id:     "edit-node",
    emoji:  "✏️",
    title:  "Двойной клик или долгий тап",
    sub:    "На дочернем узле — откроется редактирование",
    target: "[data-ob='child-node']",
  },
  {
    id:     "add-child",
    emoji:  "➕",
    title:  "Добавьте подзадачу",
    sub:    "Нажмите «+ Добавить задачу»",
    target: "[data-ob='add-button']",
  },
  {
    id:     "navigate-into",
    emoji:  "🔍",
    title:  "Провалитесь глубже",
    sub:    "Один клик / тап на дочернем или внучатом узле — переход на его уровень",
    target: "[data-ob='child-node']",
  },
];

const STORAGE_KEY = "mindes_onboarding_v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { completed: [], done: false };
}

function saveState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

// ─── Хук ─────────────────────────────────────────────────────────────────────
export function useOnboarding() {
  const [state, setState] = useState(loadState);

  const currentStep = state.done
    ? null
    : STEPS.find(s => !state.completed.includes(s.id)) ?? null;

  const isActive = !state.done && currentStep !== null;

  const completeStep = useCallback((id) => {
    setState(prev => {
      if (prev.done) return prev;
      if (prev.completed.includes(id)) return prev;
      const stepIdx    = STEPS.findIndex(s => s.id === id);
      const currentIdx = STEPS.findIndex(s => !prev.completed.includes(s.id));
      if (stepIdx !== currentIdx) return prev;
      const completed = [...prev.completed, id];
      const allDone   = completed.length === STEPS.length;
      const next = { ...prev, completed, done: allDone };
      saveState(next);
      return next;
    });
  }, []);

  const skip = useCallback(() => {
    setState(prev => { const n = { ...prev, done: true }; saveState(n); return n; });
  }, []);

  const restart = useCallback(() => {
    const n = { completed: [], done: false };
    saveState(n); setState(n);
  }, []);

  return { isActive, currentStep, state, completeStep, skip, restart };
}

// ─── Стрелка к целевому элементу ─────────────────────────────────────────────
function ArrowOverlay({ target: selector, bannerRef }) {
  const [pts, setPts] = useState(null);

  useLayoutEffect(() => {
    if (!selector) { setPts(null); return; }

    function measure() {
      const el     = document.querySelector(selector);
      const banner = bannerRef?.current;
      if (!el || !banner) { setPts(null); return; }

      const tr = el.getBoundingClientRect();
      const br = banner.getBoundingClientRect();

      // Стрелка стартует из верхней середины баннера
      const x1 = br.left + br.width / 2;
      const y1 = br.top;

      // Стрелка заканчивается у ближайшего края целевого элемента
      const tx = tr.left + tr.width  / 2;
      const ty = tr.top  + tr.height / 2;

      // Если цель выше баннера — идём вверх; ниже — вниз (редко)
      const endY = ty > y1 ? tr.top  : tr.bottom;
      const endX = tx;

      setPts({ x1, y1, x2: endX, y2: endY });
    }

    measure();
    window.addEventListener("resize",   measure);
    window.addEventListener("scroll",   measure, true);
    // Повторяем замер через 100 мс — элемент может ещё не отрендерился
    const t = setTimeout(measure, 120);
    return () => {
      window.removeEventListener("resize",  measure);
      window.removeEventListener("scroll",  measure, true);
      clearTimeout(t);
    };
  }, [selector]);

  if (!pts) return null;

  const { x1, y1, x2, y2 } = pts;
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Контрольная точка для кривой Безье — смещаем к цели горизонтально
  const cpx = x1 + dx * 0.4;
  const cpy = y1 + dy * 0.1;

  // Вектор в конечной точке (для стрелки)
  const tx = x2 - cpx, ty2 = y2 - cpy;
  const len = Math.sqrt(tx * tx + ty2 * ty2) || 1;
  const nx = tx / len, ny = ty2 / len;
  const AS = 11; // arrowhead size

  const ah1x = x2 - AS * nx + AS * 0.5 * ny;
  const ah1y = y2 - AS * ny - AS * 0.5 * nx;
  const ah2x = x2 - AS * nx - AS * 0.5 * ny;
  const ah2y = y2 - AS * ny + AS * 0.5 * nx;

  return (
    <svg
      style={{
        position: "fixed", inset: 0,
        width: "100%", height: "100%",
        zIndex: 28, pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <defs>
        <filter id="ob-glow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Тень */}
      <path
        d={`M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`}
        stroke="rgba(0,0,0,0.18)" strokeWidth="4"
        fill="none" strokeLinecap="round"
        strokeDasharray="7 5"
      />
      {/* Основная линия */}
      <path
        d={`M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`}
        stroke="#5b3fc4" strokeWidth="2.5"
        fill="none" strokeLinecap="round"
        strokeDasharray="7 5"
        opacity="0.85"
        filter="url(#ob-glow)"
        style={{ animation: "obDash 1.2s linear infinite" }}
      />
      {/* Наконечник */}
      <path
        d={`M ${ah1x} ${ah1y} L ${x2} ${y2} L ${ah2x} ${ah2y}`}
        stroke="#5b3fc4" strokeWidth="2.5"
        fill="none" strokeLinecap="round" strokeLinejoin="round"
        opacity="0.85"
      />
      <style>{`
        @keyframes obDash {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -24; }
        }
      `}</style>
    </svg>
  );
}

// ─── Баннер ──────────────────────────────────────────────────────────────────
export function OnboardingBanner({ onboarding, theme }) {
  const { isActive, currentStep, state, skip } = onboarding;
  const [justFinished, setJustFinished] = useState(false);
  const prevDone  = useRef(state.done);
  const bannerRef = useRef(null);

  useEffect(() => {
    if (state.done && !prevDone.current) {
      setJustFinished(true);
      const t = setTimeout(() => setJustFinished(false), 3500);
      return () => clearTimeout(t);
    }
    prevDone.current = state.done;
  }, [state.done]);

  // «Отлично!»
  if (justFinished) {
    return (
      <div ref={bannerRef} style={bannerStyle(theme)}>
        <span style={{ fontSize: 22 }}>🎉</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>Отлично! Обучение пройдено</div>
          <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>Вернуться можно через меню → Обучение</div>
        </div>
      </div>
    );
  }

  if (!isActive || !currentStep) return null;

  const stepIdx = STEPS.findIndex(s => s.id === currentStep.id);
  const total   = STEPS.length;

  return (
    <>
      {/* Стрелка */}
      <ArrowOverlay target={currentStep.target} bannerRef={bannerRef} />

      {/* Баннер */}
      <div ref={bannerRef} data-ob-banner style={bannerStyle(theme)}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{currentStep.emoji}</span>

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
        position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 5, zIndex: 29, pointerEvents: "none",
      }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{
            width: i === stepIdx ? 18 : 6, height: 6, borderRadius: 3,
            background: state.completed.includes(s.id)
              ? "#5b3fc4"
              : i === stepIdx ? "#5b3fc480" : theme.surfaceBorder,
            transition: "all .25s ease",
          }} />
        ))}
      </div>
    </>
  );
}

// ─── Пустой экран ─────────────────────────────────────────────────────────────
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
