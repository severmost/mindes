// Onboarding — пошаговое обучение новых пользователей.
// Состояние хранится в localStorage; шаги завершаются автоматически
// когда соответствующее действие сделано впервые.

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";

// ─── Шаги ────────────────────────────────────────────────────────────────────
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
    id:     "add-child",
    emoji:  "➕",
    title:  "Добавьте подзадачу",
    sub:    "Нажмите «+ Добавить задачу»",
    target: "[data-ob='add-button']",
  },
  {
    id:     "edit-node",
    emoji:  "✏️",
    title:  "Двойной клик или долгий тап",
    sub:    "На дочернем узле — откроется редактирование",
    target: "[data-ob='child-node']",
  },
  {
    id:     "navigate-into",
    emoji:  "🔍",
    title:  "Провалитесь глубже",
    sub:    "Один клик / тап на дочернем узле — переход на его уровень",
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

// ─── Затемнение вокруг цели (spotlight) ──────────────────────────────────────
// Четыре прямоугольника вокруг target-элемента блокируют весь остальной UI.
// Сам target остаётся открытым и кликабельным.
function SpotlightOverlay({ targetRect }) {
  if (!targetRect) return null;

  const M  = 8; // отступ подсветки вокруг элемента
  const tx = targetRect.x      - M;
  const ty = targetRect.y      - M;
  const tw = targetRect.width  + M * 2;
  const th = targetRect.height + M * 2;

  const BG = "rgba(0,0,0,0.42)";
  const base = { position: "fixed", background: BG, zIndex: 27 };

  return (
    <>
      <div style={{ ...base, top: 0, left: 0, right: 0, height: Math.max(0, ty) }} />
      <div style={{ ...base, top: ty + th, left: 0, right: 0, bottom: 0 }} />
      <div style={{ ...base, top: ty, left: 0, width: Math.max(0, tx), height: th }} />
      <div style={{ ...base, top: ty, left: tx + tw, right: 0, height: th }} />
      {/* Рамка-подсветка вокруг target */}
      <div style={{
        position: "fixed", top: ty, left: tx, width: tw, height: th,
        border: "1.5px solid rgba(255,255,255,0.18)",
        borderRadius: 10, zIndex: 28, pointerEvents: "none",
      }} />
    </>
  );
}

// ─── Стрелка к целевому элементу ─────────────────────────────────────────────
function ArrowSvg({ pts }) {
  if (!pts) return null;

  const { x1, y1, x2, y2 } = pts;
  const dx = x2 - x1, dy = y2 - y1;

  // Контрольная точка безье
  const cpx = x1 + dx * 0.35;
  const cpy = y1 + dy * 0.15;

  // Касательный вектор в конечной точке (от cp до end)
  const tx = x2 - cpx, ty2 = y2 - cpy;
  const len = Math.sqrt(tx * tx + ty2 * ty2) || 1;
  const nx = tx / len, ny = ty2 / len;
  const AS = 8;

  const ah1x = x2 - AS * nx + AS * 0.5 * ny;
  const ah1y = y2 - AS * ny - AS * 0.5 * nx;
  const ah2x = x2 - AS * nx - AS * 0.5 * ny;
  const ah2y = y2 - AS * ny + AS * 0.5 * nx;

  const C = "rgba(160,160,175,0.65)";

  return (
    <svg style={{
      position: "fixed", inset: 0, width: "100%", height: "100%",
      zIndex: 29, pointerEvents: "none", overflow: "visible",
    }}>
      <path
        d={`M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`}
        stroke={C} strokeWidth="1.5" fill="none" strokeLinecap="round"
        strokeDasharray="6 5"
        style={{ animation: "obDash 1.2s linear infinite" }}
      />
      <path
        d={`M ${ah1x} ${ah1y} L ${x2} ${y2} L ${ah2x} ${ah2y}`}
        stroke={C} strokeWidth="1.5" fill="none"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <style>{`
        @keyframes obDash { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -22; } }
      `}</style>
    </svg>
  );
}

// ─── Баннер ──────────────────────────────────────────────────────────────────
export function OnboardingBanner({ onboarding, theme }) {
  const { isActive, currentStep, state, skip } = onboarding;
  const [justFinished, setJustFinished] = useState(false);
  const prevDone    = useRef(state.done);
  const bannerRef   = useRef(null);
  const [targetRect, setTargetRect] = useState(null);
  const [arrowPts,   setArrowPts]   = useState(null);

  // «Отлично!» при завершении всех шагов
  useEffect(() => {
    if (state.done && !prevDone.current) {
      setJustFinished(true);
      const t = setTimeout(() => setJustFinished(false), 3500);
      return () => clearTimeout(t);
    }
    prevDone.current = state.done;
  }, [state.done]);

  // Замер позиций target и баннера → вычисляем точки стрелки
  useLayoutEffect(() => {
    if (!isActive || !currentStep?.target) {
      setTargetRect(null); setArrowPts(null); return;
    }

    function measure() {
      const el     = document.querySelector(currentStep.target);
      const banner = bannerRef.current;
      if (!el || !banner) { setTargetRect(null); setArrowPts(null); return; }

      const tr = el.getBoundingClientRect();
      const br = banner.getBoundingClientRect();
      setTargetRect(tr);

      // Старт: центр баннера
      const x1 = br.left + br.width  / 2;
      const y1 = br.top  + br.height / 2;

      // Центр цели
      const tcx = tr.left + tr.width  / 2;
      const tcy = tr.top  + tr.height / 2;
      const dx  = tcx - x1;
      const dy  = tcy - y1;
      const GAP = 10;

      // Конец стрелки — на ближайшем крае цели (горизонталь или вертикаль)
      let endX, endY;
      if (Math.abs(dx) > Math.abs(dy) * 1.3) {
        // Цель сбоку → входим в левый или правый край
        endX = dx > 0 ? tr.left  - GAP : tr.right + GAP;
        endY = Math.max(tr.top + 6, Math.min(tr.bottom - 6, y1));
      } else {
        // Цель сверху/снизу → входим в верхний или нижний край
        endX = tcx;
        endY = dy > 0 ? tr.top - GAP : tr.bottom + GAP;
      }

      setArrowPts({ x1, y1, x2: endX, y2: endY });
    }

    measure();
    const t = setTimeout(measure, 120);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [isActive, currentStep?.target]);

  if (justFinished) {
    return (
      <div style={bannerStyle(theme)}>
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
      {/* Затемнение */}
      <SpotlightOverlay targetRect={targetRect} />

      {/* Стрелка */}
      <ArrowSvg pts={arrowPts} />

      {/* Баннер */}
      <div ref={bannerRef} style={bannerStyle(theme)}>
        {/* Прогресс-точки — внутри баннера сверху */}
        <div style={{
          position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 5, pointerEvents: "none",
        }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{
              width: i === stepIdx ? 18 : 6, height: 6, borderRadius: 3,
              background: state.completed.includes(s.id)
                ? "#5b3fc4"
                : i === stepIdx ? "#5b3fc4cc" : "rgba(255,255,255,0.3)",
              transition: "all .25s ease",
            }} />
          ))}
        </div>

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
          zIndex: 1, position: "relative",
        }}>
          Пропустить
        </button>
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
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ opacity: 0.2 }}>
        <path d="M6 18 C6 15.8 7.8 14 10 14 L24 14 L28 19 L54 19 C56.2 19 58 20.8 58 23 L58 50 C58 52.2 56.2 54 54 54 L10 54 C7.8 54 6 52.2 6 50 Z"
          stroke={theme.text} strokeWidth="2.5" strokeLinejoin="round" fill="none"/>
        <line x1="32" y1="30" x2="32" y2="44" stroke={theme.text} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="25" y1="37" x2="39" y2="37" stroke={theme.text} strokeWidth="2.5" strokeLinecap="round"/>
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
    boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
    display: "flex", alignItems: "center", gap: 12,
    maxWidth: 380, width: "calc(100vw - 32px)",
    animation: "overlaySlideUp .25s ease",
    boxSizing: "border-box",
    position: "fixed",
  };
}
