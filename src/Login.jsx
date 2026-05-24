import { useState } from "react";
import { signInWithGoogle } from "./auth";
import { themes } from "./theme";

/* ── палитра карточек-превью ── */
const CARD_COLORS = {
  purple: "#7c5fe6",
  orange: "#f59e3a",
  yellow: "#facc15",
  blue:   "#3b82f6",
  red:    "#ef4444",
  green:  "#22c55e",
};

/* ── данные плавающих карточек (левая витрина) ── */
const SHOWCASE_CARDS = [
  {
    cls: "c1", accent: CARD_COLORS.purple, progress: 24,
    title: "Частые дела",
    body: "Покупки, повседневные задачи",
    meta: "7 / 29", metaDot: true,
    style: { top: 30,  left: 0 },   delay: "-0.4s",
  },
  {
    cls: "c2", accent: CARD_COLORS.orange, progress: 0,
    title: "Мои цели",
    titleSub: "долгосрочные",
    body: "Идеи, которые я должен реализовать",
    meta: "0 / 9",
    style: { top: 80,  left: 230 }, delay: "-1.2s",
  },
  {
    cls: "c3", accent: CARD_COLORS.yellow, progress: 0,
    title: "Здоровье",
    body: "Записи к врачам, тренировки, походы",
    meta: "0 / 1", metaRight: { text: "просрочено", color: CARD_COLORS.red },
    style: { top: 60,  left: 460 }, delay: "-2.0s",
  },
  {
    cls: "c4", accent: CARD_COLORS.blue, progress: 0,
    title: "Покупки на неделю",
    body: "Овощи, фрукты, хлеб",
    meta: "0 / 1", metaRight: { text: "сегодня 18:09", color: CARD_COLORS.orange },
    style: { top: 280, left: 100 }, delay: "-2.8s",
  },
  {
    cls: "c5", accent: CARD_COLORS.red, progress: 0,
    title: "Ремонт балкона",
    body: "Замер, материалы, мастер",
    meta: "0 / 1", metaRight: { text: "просрочено", color: CARD_COLORS.red },
    style: { top: 320, left: 340 }, delay: "-3.6s",
  },
  {
    cls: "c6", accent: CARD_COLORS.green, progress: 60,
    title: "Тренировки",
    body: "3 раза в неделю, ноги-спина-руки",
    meta: "6 / 10",
    style: { top: 260, left: 560 }, delay: "-4.4s",
  },
];

/* ── список фич ── */
const FEATURES = [
  { color: CARD_COLORS.purple, text: "Чёткая иерархия — вся структура целей видна одним взглядом" },
  { color: CARD_COLORS.orange, text: "Цветовое кодирование — проекты различаются с расстояния" },
  { color: CARD_COLORS.blue,   text: "Просрочено / сегодня / неделя — без меню и фильтров" },
  { color: CARD_COLORS.green,  text: "Синхронизация через ваш Google-аккаунт" },
];

/* ── Google logo SVG ── */
function GoogleLogo() {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

/* ── Moon / Sun icons ── */
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════ */
export default function Login({ theme = themes.dark, themeName, onToggleTheme }) {
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState(null);
  const isDark = theme.name === "dark";

  /* ── цвета, зависящие от темы ── */
  const T = isDark ? {
    bg1:      "#14102e",
    bg2:      "#1f1840",
    card:     "rgba(255,255,255,0.04)",
    cardGlass:"rgba(255,255,255,0.04)",
    ink:      "#f0ecff",
    ink2:     "#b3aad6",
    ink3:     "#7a72a0",
    line:     "rgba(255,255,255,0.08)",
    shadow:   "0 30px 80px -30px rgba(0,0,0,0.6)",
    cardBg:   "rgba(255,255,255,0.06)",
    cardBorder:"rgba(255,255,255,0.08)",
    taskShadow:"0 16px 40px -16px rgba(0,0,0,0.4)",
    toggleBg: "rgba(255,255,255,0.06)",
    toggleBorder:"rgba(255,255,255,0.1)",
    accentTitle:"#7c5fe6",
    gradient: `radial-gradient(60% 80% at 100% 50%, rgba(91,63,196,0.5), transparent 70%),
               radial-gradient(50% 70% at 0% 100%, rgba(40,60,180,0.3), transparent 70%),
               #14102e`,
  } : {
    bg1:      "#ede8ff",
    bg2:      "#d9d0ff",
    card:     "#ffffff",
    cardGlass:"#ffffff",
    ink:      "#1a1530",
    ink2:     "#4f4970",
    ink3:     "#8a85a8",
    line:     "rgba(91,63,196,0.12)",
    shadow:   "0 30px 80px -30px rgba(40,20,100,0.25)",
    cardBg:   "#ffffff",
    cardBorder:"rgba(91,63,196,0.12)",
    taskShadow:"0 16px 40px -16px rgba(40,20,100,0.25), 0 4px 10px -4px rgba(40,20,100,0.1)",
    toggleBg: "#ffffff",
    toggleBorder:"rgba(91,63,196,0.12)",
    accentTitle:"#5b3fc4",
    gradient: `radial-gradient(60% 80% at 100% 50%, rgba(124,95,230,0.18), transparent 70%),
               radial-gradient(50% 70% at 0% 100%, rgba(59,130,246,0.12), transparent 70%),
               #ede8ff`,
  };

  async function handleSignIn() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      const code = e?.code || "";
      if (!(code.includes("popup-closed") || code.includes("cancelled"))) {
        setError(e?.message || "Не удалось войти");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: T.gradient,
      fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
      color: T.ink,
      WebkitFontSmoothing: "antialiased",
      overflowX: "hidden",
    }}>
      {/* Keyframes */}
      <style>{`
        @keyframes loginFloat {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0,
        padding: "24px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        zIndex: 10,
        paddingTop: "calc(24px + env(safe-area-inset-top))",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 600, letterSpacing: "-0.015em", color: T.ink }}>
          <img src="/icon.svg" alt="Mindes" style={{ width: 28, height: 28, borderRadius: 7 }} />
          <span>Mindes</span>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1.15fr 1fr",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
      }}
        className="login-stage"
      >
        {/* Responsive override via a style tag */}
        <style>{`
          @media (max-width: 960px) {
            .login-stage {
              grid-template-columns: 1fr !important;
              grid-template-rows: 1fr auto !important;
              height: auto !important;
              min-height: 100vh;
            }
            .login-showcase {
              padding: 80px 20px 0 !important;
              height: 260px !important;
            }
            .login-deck {
              transform: rotate(-4deg) scale(0.52) !important;
              transform-origin: top center !important;
            }
            .login-right {
              padding: 24px 20px 80px !important;
            }
            .login-auth-card {
              padding: 32px 24px 24px !important;
              border-radius: 24px !important;
            }
            .login-title { font-size: 30px !important; }
          }
          @media (max-width: 480px) {
            .login-title { font-size: 26px !important; }
            .login-showcase { height: 220px !important; }
            .login-deck { transform: rotate(-4deg) scale(0.42) !important; }
          }
        `}</style>

        {/* ── LEFT: floating cards showcase ── */}
        <div className="login-showcase" style={{
          position: "relative", height: "100%", overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 24px 0 56px",
        }} aria-hidden="true">
          <div className="login-deck" style={{
            position: "relative",
            width: 760, height: 560,
            transform: "rotate(-6deg) translateZ(0)",
          }}>
            {/* SVG connector lines */}
            <svg style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: isDark ? 0.4 : 0.25, color: T.ink2 }}
              viewBox="0 0 760 560" fill="none">
              <path d="M 100 100 C 200 200, 280 240, 200 380" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 6"/>
              <path d="M 330 150 C 400 250, 380 300, 440 400" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 6"/>
              <path d="M 560 130 C 640 200, 700 280, 660 350" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 6"/>
            </svg>

            {SHOWCASE_CARDS.map((card) => (
              <div key={card.cls} style={{
                position: "absolute",
                top:  card.style.top,
                left: card.style.left,
                width: 200,
                background: isDark ? card.cardBg || "rgba(255,255,255,0.06)" : T.cardBg,
                backdropFilter: isDark ? "blur(20px)" : "none",
                WebkitBackdropFilter: isDark ? "blur(20px)" : "none",
                borderRadius: 16,
                padding: "16px 16px 14px",
                overflow: "hidden",
                boxShadow: T.taskShadow,
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : T.line}`,
                color: T.ink,
                animationName: "loginFloat",
                animationDuration: "8s",
                animationTimingFunction: "ease-in-out",
                animationIterationCount: "infinite",
                animationDelay: card.delay,
              }}>
                {/* left accent stripe */}
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: card.accent, borderRadius: "3px 0 0 3px" }} />
                <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.25, marginBottom: 8 }}>
                  {card.title}
                  {card.titleSub && <><br/><span style={{ fontWeight: 500, color: T.ink3 }}>{card.titleSub}</span></>}
                </div>
                <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.45, marginBottom: 16, WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", display: "-webkit-box" }}>
                  {card.body}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: T.ink3 }}>
                  <span>
                    {card.metaDot && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: card.accent, marginRight: 6, verticalAlign: "middle" }} />}
                    {card.meta}
                  </span>
                  {card.metaRight && <span style={{ color: card.metaRight.color }}>{card.metaRight.text}</span>}
                </div>
                <div style={{ height: 3, background: isDark ? "rgba(255,255,255,0.1)" : T.line, borderRadius: 2, overflow: "hidden", marginTop: 10 }}>
                  <div style={{ height: "100%", width: `${card.progress}%`, background: card.accent, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: auth card ── */}
        <div className="login-right" style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 56px 0 24px",
          position: "relative", zIndex: 2,
        }}>
          <div className="login-auth-card" style={{
            width: "100%", maxWidth: 460,
            background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
            backdropFilter: isDark ? "blur(40px)" : "none",
            WebkitBackdropFilter: isDark ? "blur(40px)" : "none",
            borderRadius: 28,
            padding: "40px 40px 32px",
            boxShadow: T.shadow,
            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : T.line}`,
            position: "relative", overflow: "hidden",
          }}>
            {/* Logo */}
            <img src="/icon.svg" alt="Mindes" style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 24, display: "block" }} />

            {/* Kicker */}
            <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: T.ink3, marginBottom: 12 }}>
              Mindes · v1.0
            </div>

            {/* Title */}
            <h1 className="login-title" style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.0, margin: "0 0 16px", color: T.ink }}>
              Все ваши мысли<br/>
              на <span style={{ color: T.accentTitle }}>одном экране</span>.
            </h1>

            {/* Subtitle */}
            <p style={{ fontSize: 15, lineHeight: 1.5, color: T.ink2, margin: "0 0 28px" }}>
              Визуальный планировщик задач: чёткая иерархия, цвет вместо тегов, синхронизация между всеми устройствами.
            </p>

            {/* Feature list */}
            <ul style={{ margin: "0 0 32px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {FEATURES.map((f, i) => (
                <li key={i} style={{ fontSize: 13.5, lineHeight: 1.4, color: T.ink2, display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: "50%", background: f.color, marginTop: 7, display: "block" }} />
                  {f.text}
                </li>
              ))}
            </ul>

            {/* Google sign-in button */}
            <button
              onClick={handleSignIn}
              disabled={busy}
              style={{
                width: "100%",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                background: "white", color: "#1a1a1f",
                border: "1px solid rgba(0,0,0,0.08)",
                padding: "14px 20px", borderRadius: 14,
                fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
                fontSize: 15, fontWeight: 500,
                cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.7 : 1,
                transition: "transform 0.12s, box-shadow 0.12s",
                boxShadow: "0 4px 14px -4px rgba(0,0,0,0.12)",
              }}
              onMouseEnter={e => { if (!busy) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 22px -8px rgba(0,0,0,0.18)"; }}}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px -4px rgba(0,0,0,0.12)"; }}
              onMouseDown={e => { if (!busy) e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <GoogleLogo />
              {busy ? "Входим…" : "Войти через Google"}
            </button>

            {/* Error */}
            {error && (
              <div style={{
                marginTop: 14, padding: "10px 14px", borderRadius: 10,
                background: "#FF525215", border: "1px solid #FF525230",
                color: "#c75050", fontSize: 12,
              }}>{error}</div>
            )}

            {/* Footnote */}
            <p style={{ fontSize: 12, color: T.ink3, textAlign: "center", margin: "16px 0 0", lineHeight: 1.45 }}>
              Ваши задачи сохраняются в вашем Google-аккаунте<br/>и синхронизируются между устройствами.
            </p>
          </div>
        </div>
      </div>

      {/* ── Theme toggle (bottom-left) ── */}
      {onToggleTheme && (
        <button
          onClick={onToggleTheme}
          style={{
            position: "fixed",
            bottom: "calc(24px + env(safe-area-inset-bottom))",
            left: 24,
            zIndex: 20,
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 14px",
            background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.85)",
            color: T.ink,
            border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : T.line}`,
            borderRadius: 999,
            fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
            fontSize: 13, fontWeight: 500,
            cursor: "pointer",
            transition: "transform 0.12s, box-shadow 0.12s",
            boxShadow: "0 4px 14px -6px rgba(0,0,0,0.18)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 22px -8px rgba(0,0,0,0.25)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px -6px rgba(0,0,0,0.18)"; }}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
          <span>{isDark ? "Светлая тема" : "Тёмная тема"}</span>
        </button>
      )}
    </div>
  );
}
