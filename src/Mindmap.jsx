// Mindmap: иерархический карточный список вместо SVG-радиала.
// Навигация: клик по дочерней/внучатой карте → она становится центром.
// Редактирование: двойной клик/долгий тап → панель редактирования.

import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { ensureNotificationPermission } from "./notifications";
import BrandLogo from "./BrandLogo";
import { useWindowWidth } from "./hooks";
import {
  COLORS, PRIORITY_COLORS, genId,
  toLocalInput, fromLocalInput, formatDeadline,
  calcNextDeadline, collectBranchStats,
  countTasks, countDirectKids,
  updateNode, findNode, findPath, removeNode, addChild,
  setAllDone, isAllDone, getNodeColor,
  collectArchived, collectByDeadline,
} from "./utils";

// ── Icons ──
function SunIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>;
}
function MoonIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
}

// ── Color Picker ──
function ColorPicker({ currentIdx, onChange, onClose, theme }) {
  return (
    <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 6, zIndex: 30, background: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 10, padding: 10, display: "flex", flexWrap: "wrap", gap: 6, width: 168, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
      {COLORS.map((c, i) => (
        <div key={i} onClick={() => { onChange(i); onClose(); }}
          style={{ width: 28, height: 28, borderRadius: 6, background: c.bg, cursor: "pointer", border: i === currentIdx ? `3px solid #fff` : "3px solid transparent", transition: "transform .15s", transform: i === currentIdx ? "scale(1.15)" : "scale(1)" }}
          onMouseEnter={e => e.target.style.transform = "scale(1.15)"}
          onMouseLeave={e => { if (i !== currentIdx) e.target.style.transform = "scale(1)"; }} />
      ))}
    </div>
  );
}

// ── Map Header ──
function MapHeader({ maps, activeId, user, onSignOut, theme, themeName, onToggleTheme, onOpenToday, onOpenArchive, onGoHome, onOpenBgPanel }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const activeMap = maps.find(m => m.id === activeId);
  const mapIdx = maps.findIndex(m => m.id === activeId);
  const resolvedColorIdx = (activeMap?.tree?.colorIdx !== undefined && activeMap?.tree?.colorIdx !== null)
    ? activeMap.tree.colorIdx : (mapIdx >= 0 ? mapIdx : 0);
  const tc = COLORS[resolvedColorIdx % COLORS.length];

  return (
    <div style={{ flexShrink: 0, height: 56, display: "flex", alignItems: "center", background: "transparent", padding: "0 16px", gap: 10, zIndex: 15 }}
      onClick={() => menuOpen && setMenuOpen(false)}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        {/* Логотип кликабелен — ведёт на главную */}
        <BrandLogo size={28} fontSize={15} onClick={onGoHome} />
        {activeMap?.name && (
          <>
            <span style={{ color: theme.surfaceBorder, fontSize: 16, flexShrink: 0 }}>›</span>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: tc.bg, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeMap.name}</span>
          </>
        )}
      </div>
      {user && (
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 6,
              display: "flex", flexDirection: "column", gap: 5.5 }}>
            <div style={{ width: 24, height: 4, borderRadius: 2, background: "#5b3fc4", transition: "transform .25s", transformOrigin: "center", transform: menuOpen ? "translateY(9.5px) rotate(45deg)" : "none" }} />
            <div style={{ width: 24, height: 4, borderRadius: 2, background: "#5b3fc4", transition: "opacity .2s", opacity: menuOpen ? 0 : 1 }} />
            <div style={{ width: 24, height: 4, borderRadius: 2, background: "#5b3fc4", transition: "transform .25s", transformOrigin: "center", transform: menuOpen ? "translateY(-9.5px) rotate(-45deg)" : "none" }} />
          </button>
          {menuOpen && (
            <div onClick={e => e.stopPropagation()} style={{
              position: "absolute", top: 48, right: 0, zIndex: 40,
              background: theme.panelBg, border: `1px solid ${theme.surfaceBorder}`,
              borderRadius: 14, padding: "8px 0", minWidth: 190,
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              animation: "menuIn .18s ease",
            }}>
              <div style={{ fontSize: 12, color: theme.textDim, padding: "4px 16px 8px", borderBottom: `1px solid ${theme.surfaceBorder}`, marginBottom: 4, wordBreak: "break-all" }}>{user.email}</div>
              {[
                { label: "Сегодня", action: () => { setMenuOpen(false); onOpenToday?.(); } },
                { label: "Архив",   action: () => { setMenuOpen(false); onOpenArchive?.(); } },
                { label: "Фон",     action: () => { setMenuOpen(false); onOpenBgPanel?.(); } },
              ].map(({ label, action }) => (
                <div key={label} className="menu-item" onClick={action}>{label}</div>
              ))}
              <div style={{ height: 1, background: theme.surfaceBorderSoft, margin: "4px 0" }} />
              <div className="menu-item" onClick={() => { setMenuOpen(false); onToggleTheme(); }}
                style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-flex", color: theme.btnText }}>{themeName === "dark" ? <SunIcon size={15} /> : <MoonIcon size={15} />}</span>
                {themeName === "dark" ? "Светлая тема" : "Тёмная тема"}
              </div>
              <div className="menu-item-danger" onClick={() => { setMenuOpen(false); onSignOut(); }}
                style={{ color: "#FF8A8A" }}>Выйти</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Overlay List (Сегодня / Архив) ──
function OverlayList({ title, children, theme, onClose }) {
  const touchStartY = useRef(0);
  const onTouchStart = e => { touchStartY.current = e.touches[0].clientY; };
  const onTouchEnd = e => { if (e.changedTouches[0].clientY - touchStartY.current > 80) onClose(); };
  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      style={{ position: "fixed", inset: 0, paddingTop: "env(safe-area-inset-top)", background: theme.appBg, color: theme.text, zIndex: 30, display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif", animation: "overlaySlideUp .2s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${theme.surfaceBorderSoft}`, flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{title}</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", color: theme.textMuted, fontSize: 26, cursor: "pointer", lineHeight: 1, padding: "4px 10px" }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", maxWidth: 700, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {children}
      </div>
    </div>
  );
}

// ── Branch Stats (desktop right column) ──
function BranchStats({ node, theme, onAdd }) {
  const { total, done, pri, deadlines } = collectBranchStats(node);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const priTotal = pri.high + pri.medium + pri.low;
  const now = new Date();
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7);

  const label = (fontSize, color, text) => (
    <div style={{ fontSize, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 10 }}>{text}</div>
  );

  return (
    <div style={{
      width: 260, flexShrink: 0,
      borderLeft: `1px solid ${theme.surfaceBorderSoft}`,
      overflowY: "auto",
      padding: "20px 16px 32px",
      display: "flex", flexDirection: "column", gap: 24,
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Progress */}
      <div>
        {label(10, theme.sectionLabel, "Прогресс")}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: theme.text, lineHeight: 1 }}>{pct}%</span>
          <span style={{ fontSize: 12, color: theme.textMuted }}>{done} / {total}</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: theme.progressTrack, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: pct === 100 ? "#22c55e" : "#5b3fc4", transition: "width .5s" }} />
        </div>
      </div>

      {/* Priorities */}
      {priTotal > 0 && (
        <div>
          {label(10, theme.sectionLabel, "Приоритеты")}
          <div style={{ height: 6, borderRadius: 3, overflow: "hidden", display: "flex", marginBottom: 10 }}>
            {pri.high   > 0 && <div style={{ width: `${(pri.high   / priTotal) * 100}%`, height: "100%", background: "#F44336" }} />}
            {pri.medium > 0 && <div style={{ width: `${(pri.medium / priTotal) * 100}%`, height: "100%", background: "#FFC107" }} />}
            {pri.low    > 0 && <div style={{ width: `${(pri.low    / priTotal) * 100}%`, height: "100%", background: "#4CAF50" }} />}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {pri.high   > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: "#F44336", fontWeight: 600 }}>Высокий</span><span style={{ color: theme.textMuted }}>{pri.high}</span></div>}
            {pri.medium > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: "#FFC107", fontWeight: 600 }}>Средний</span><span style={{ color: theme.textMuted }}>{pri.medium}</span></div>}
            {pri.low    > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: "#4CAF50", fontWeight: 600 }}>Низкий</span><span style={{ color: theme.textMuted }}>{pri.low}</span></div>}
          </div>
        </div>
      )}

      {/* Deadlines */}
      {deadlines.length > 0 && (
        <div>
          {label(10, theme.sectionLabel, "Сроки")}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {deadlines.map(({ id, text, deadline, time }) => {
              const overdue = deadline < now;
              const isToday = deadline <= todayEnd && !overdue;
              const isWeek  = deadline <= weekEnd && !isToday && !overdue;
              const color = overdue ? "#F44336" : isToday ? "#FB8C00" : isWeek ? "#FFC107" : theme.textMuted;
              const pad = n => String(n).padStart(2, "0");
              const dateLabel = overdue ? "просрочено"
                : isToday ? `сегодня ${pad(deadline.getHours())}:${pad(deadline.getMinutes())}`
                : `${pad(deadline.getDate())}.${pad(deadline.getMonth()+1)}`;
              return (
                <div key={id} style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 5 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</div>
                    <div style={{ fontSize: 11, color, marginTop: 1 }}>{dateLabel}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add button */}
      <button onClick={onAdd} style={{
        marginTop: "auto", padding: "10px", borderRadius: 10,
        border: `1.5px dashed ${theme.surfaceBorder}`, background: "transparent",
        color: theme.textMuted, fontFamily: "'Inter'", fontWeight: 600, fontSize: 13,
        cursor: "pointer", transition: "border-color .15s, color .15s",
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = theme.textDim; e.currentTarget.style.color = theme.text; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = theme.surfaceBorder; e.currentTarget.style.color = theme.textMuted; }}>
        + Добавить задачу
      </button>
    </div>
  );
}

// ── Side Panel ──
function SidePanel({ node, tree, setTree, onClose, onDelete, theme, isMobile }) {
  if (!node) return null;
  const allDone = isAllDone(node);
  const { total, done } = countTasks(node);
  const [title, setTitle] = useState(node.text);
  const [desc, setDesc] = useState(node.description || "");
  const [newItem, setNewItem] = useState("");
  const [showColors, setShowColors] = useState(false);
  const [deadline, setDeadline] = useState(node.deadline || "");
  const [remindEnabled, setRemindEnabled] = useState(!!node.remindBefore);
  const [remindH, setRemindH] = useState(() => Math.floor((node.remindBefore || 30) / 60));
  const [remindM, setRemindM] = useState(() => (node.remindBefore || 30) % 60);
  const [repeat, setRepeat] = useState(node.repeat || null);
  const [repeatEvery, setRepeatEvery] = useState(node.repeat?.every || 2);

  useEffect(() => {
    setTitle(node.text);
    setDesc(node.description || "");
    setDeadline(node.deadline || "");
    setRemindEnabled(!!node.remindBefore);
    if (node.remindBefore) { setRemindH(Math.floor(node.remindBefore / 60)); setRemindM(node.remindBefore % 60); }
    else { setRemindH(0); setRemindM(30); }
    setRepeat(node.repeat || null);
    setRepeatEvery(node.repeat?.every || 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  const save = (f, v) => setTree(t => updateNode(t, node.id, n => ({ ...n, [f]: v })));

  const toggleDone = () => {
    // Повторяющаяся задача: при выполнении переносим срок на следующий цикл
    if (!allDone && node.repeat && node.deadline) {
      const nextDeadline = calcNextDeadline(node.deadline, node.repeat);
      setDeadline(nextDeadline);
      setTree(t => updateNode(t, node.id, n => ({
        ...n,
        done: false,
        deadline: nextDeadline,
        checklist: (n.checklist || []).map(c => ({ ...c, done: false })),
      })));
    } else {
      setTree(t => updateNode(t, node.id, n => setAllDone(n, !allDone)));
    }
  };
  const addCheck = () => {
    if (!newItem.trim()) return;
    setTree(t => updateNode(t, node.id, n => ({ ...n, checklist: [...(n.checklist || []), { id: genId(), text: newItem.trim(), done: false }] })));
    setNewItem("");
  };
  const toggleCheck = cid => setTree(t => updateNode(t, node.id, n => ({ ...n, checklist: (n.checklist || []).map(c => c.id === cid ? { ...c, done: !c.done } : c) })));
  const delCheck = cid => setTree(t => updateNode(t, node.id, n => ({ ...n, checklist: (n.checklist || []).filter(c => c.id !== cid) })));

  let branchColor = COLORS[0];
  if (node.colorIdx !== undefined && node.colorIdx !== null) {
    branchColor = COLORS[node.colorIdx % COLORS.length];
  } else {
    for (let i = 0; i < tree.children.length; i++) {
      if (findNode(tree.children[i], node.id)) {
        branchColor = COLORS[getNodeColor(tree.children[i], undefined, i) % COLORS.length];
        break;
      }
    }
  }
  const currentColorIdx = node.colorIdx !== undefined && node.colorIdx !== null ? node.colorIdx : COLORS.indexOf(branchColor);
  const cl = node.checklist || [];
  const cd = cl.filter(c => c.done).length;

  const sheetRef    = useRef(null);
  const handleRef   = useRef(null);

  useEffect(() => {
    const handle = handleRef.current;
    const sheet  = sheetRef.current;
    if (!handle || !sheet) return;
    let startY = 0;
    let dragging = false;

    const onStart = e => {
      startY = e.touches[0].clientY;
      dragging = false;
      sheet.style.transition = "";
    };
    const onMove = e => {
      const dy = e.touches[0].clientY - startY;
      if (dy > 4) {
        dragging = true;
        e.preventDefault(); // теперь гарантированно работает — слушатель на handle
        const t = Math.max(0, dy);
        sheet.style.transform = isMobile
          ? `translateY(${t}px)`
          : `translate(-50%, calc(-50% + ${Math.min(t * 0.35, 80)}px))`;
      }
    };
    const onEnd = e => {
      const dy = e.changedTouches[0].clientY - startY;
      if (dragging && dy > 100) {
        onClose();
      } else {
        sheet.style.transition = "transform .25s ease";
        sheet.style.transform = isMobile ? "translateY(0)" : "translate(-50%, -50%)";
        setTimeout(() => { if (sheet) sheet.style.transition = ""; }, 260);
      }
      dragging = false;
    };

    handle.addEventListener("touchstart", onStart, { passive: true });
    handle.addEventListener("touchmove",  onMove,  { passive: false });
    handle.addEventListener("touchend",   onEnd,   { passive: true });
    return () => {
      handle.removeEventListener("touchstart", onStart);
      handle.removeEventListener("touchmove",  onMove);
      handle.removeEventListener("touchend",   onEnd);
    };
  }, [isMobile, onClose]);

  const sheetStyle = {
    position: "fixed",
    zIndex: 300,
    background: theme.panelBg,
    display: "flex", flexDirection: "column",
    fontFamily: "'Inter', sans-serif", color: theme.text,
    overflow: "hidden",
    "--branch-color": branchColor.bg,
    ...(isMobile ? {
      bottom: 0, left: 0, right: 0,
      borderRadius: "20px 20px 0 0",
      maxHeight: "92vh",
      paddingBottom: "env(safe-area-inset-bottom)",
      animation: "panelIn .22s ease",
    } : {
      top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
      width: 520,
      borderRadius: 20,
      maxHeight: "88vh",
      boxShadow: "0 24px 64px rgba(0,0,0,0.32)",
    }),
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 299, background: "rgba(0,0,0,0.4)", animation: "fadeIn .2s ease" }} />
      <div ref={sheetRef} style={sheetStyle}>
      {isMobile && (
        <div ref={handleRef} style={{ padding: "14px 0 6px", display: "flex", justifyContent: "center", flexShrink: 0, touchAction: "none", cursor: "grab" }}>
          <div style={{ width: 44, height: 4, borderRadius: 2, background: theme.surfaceBorder }} />
        </div>
      )}
      <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "flex-start", gap: 8, flexShrink: 0 }}>
        <textarea className="pi" value={title}
          onChange={e => {
            setTitle(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (title.trim()) { save("text", title.trim()); e.target.blur(); } } }}
          rows={1}
          ref={el => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
          style={{ fontSize: 17, fontWeight: 700, flex: 1, resize: "none", lineHeight: 1.35, overflow: "hidden" }} />
        {title.trim() && title.trim() !== (node.text || "") && (
          <button onClick={() => save("text", title.trim())}
            style={{ background: "#22c55e", border: "none", borderRadius: 8, width: 34, height: 34, color: "#fff", fontSize: 16, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>✓</button>
        )}
        {isMobile && <button onClick={onClose} style={{ background: "none", border: "none", color: theme.textMuted, fontSize: 22, cursor: "pointer", lineHeight: 1, flexShrink: 0, marginTop: 2 }}>×</button>}
      </div>

      <div style={{ padding: "10px 20px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
        <button onClick={toggleDone} style={{ padding: "6px 18px", borderRadius: 20, border: `2px solid ${allDone ? "#4CAF50" : branchColor.bg}`, background: allDone ? "#4CAF5018" : "transparent", color: allDone ? "#4CAF50" : branchColor.bg, fontFamily: "'Inter'", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          {allDone ? "✓ Выполнено" : "Выполнить"}
        </button>
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowColors(!showColors)} style={{ padding: "6px 12px", borderRadius: 20, border: `2px solid ${theme.inputBorder}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'Inter'", fontWeight: 600, fontSize: 12, color: theme.textDim }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, background: branchColor.bg }} />Цвет
          </button>
          {showColors && <ColorPicker currentIdx={currentColorIdx} onChange={i => save("colorIdx", i)} onClose={() => setShowColors(false)} theme={theme} />}
        </div>
        {node.children.length > 0 && <span style={{ fontSize: 12, color: theme.textMuted }}>{done}/{total} подзадач</span>}
      </div>

      <div style={{ height: 1, background: theme.surfaceBorderSoft, margin: "0 20px", flexShrink: 0 }} />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Priority */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.sectionLabel, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.2 }}>Важность</div>
          <div style={{ display: "flex", gap: 6 }}>
            {Object.entries(PRIORITY_COLORS).map(([key, p]) => {
              const active = node.priority === key;
              return (
                <button key={key} onClick={() => save("priority", active ? null : key)}
                  style={{ flex: 1, padding: "8px 6px", borderRadius: 8, border: `2px solid ${active ? p.bg : theme.inputBorder}`, background: active ? p.bg + "22" : "transparent", color: active ? p.bg : theme.textDim, fontFamily: "'Inter'", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.bg, flexShrink: 0 }} />{p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Deadline */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.sectionLabel, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.2 }}>Крайний срок</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="datetime-local" className="pi"
              value={toLocalInput(deadline)}
              onChange={e => { const iso = fromLocalInput(e.target.value); setDeadline(iso || ""); save("deadline", iso); }}
              style={{ flex: 1, colorScheme: theme.name === "dark" ? "dark" : "light" }} />
            {deadline && (
              <button onClick={() => { setDeadline(""); setRemindEnabled(false); setRepeat(null); setTree(t => updateNode(t, node.id, n => ({ ...n, deadline: null, remindBefore: null, repeat: null }))); }}
                title="Убрать срок" style={{ background: "transparent", border: `1px solid ${theme.inputBorder}`, borderRadius: 8, padding: "8px 10px", color: theme.textDim, cursor: "pointer", fontFamily: "'Inter'", fontSize: 13 }}>×</button>
            )}
          </div>
          {deadline && (
            <div style={{ marginTop: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: theme.text, cursor: "pointer" }}>
                <input type="checkbox" checked={remindEnabled} onChange={async e => {
                  const on = e.target.checked; setRemindEnabled(on);
                  if (on) { const ok = await ensureNotificationPermission(); if (!ok) { setRemindEnabled(false); return; } save("remindBefore", remindH * 60 + remindM || 30); }
                  else save("remindBefore", null);
                }} />Напомнить за
              </label>
              {remindEnabled && (
                <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                  <input type="number" min="0" max="999" value={Number.isFinite(remindH) ? remindH : ""} onChange={e => { const v = e.target.value; if (v === "") setRemindH(NaN); else setRemindH(Math.max(0, parseInt(v, 10))); }} onBlur={() => { const h = Number.isFinite(remindH) ? remindH : 0; const m = Number.isFinite(remindM) ? remindM : 0; setRemindH(h); save("remindBefore", h * 60 + m || 1); }} className="pi" style={{ width: 72, textAlign: "center" }} />
                  <span style={{ fontSize: 12, color: theme.textDim }}>ч</span>
                  <input type="number" min="0" max="59" value={Number.isFinite(remindM) ? remindM : ""} onChange={e => { const v = e.target.value; if (v === "") setRemindM(NaN); else setRemindM(Math.max(0, Math.min(59, parseInt(v, 10)))); }} onBlur={() => { const h = Number.isFinite(remindH) ? remindH : 0; const m = Number.isFinite(remindM) ? remindM : 0; setRemindM(m); save("remindBefore", h * 60 + m || 1); }} className="pi" style={{ width: 72, textAlign: "center" }} />
                  <span style={{ fontSize: 12, color: theme.textDim }}>мин до срока</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Repeat — только если есть срок */}
        {deadline && <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.sectionLabel, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.2 }}>Повтор</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { key: null,      label: "Нет" },
              { key: "daily",   label: "Ежедневно" },
              { key: "weekly",  label: "Еженедельно" },
              { key: "monthly", label: "Ежемесячно" },
              { key: "custom",  label: "Каждые N дней" },
            ].map(opt => {
              const active = repeat?.type === opt.key || (opt.key === null && !repeat);
              return (
                <button key={String(opt.key)} onClick={() => {
                  const val = opt.key ? { type: opt.key, every: opt.key === "custom" ? repeatEvery : undefined } : null;
                  setRepeat(val);
                  save("repeat", val);
                }} style={{
                  padding: "7px 12px", borderRadius: 8, cursor: "pointer",
                  fontFamily: "'Inter'", fontSize: 12, fontWeight: 600,
                  border: `2px solid ${active ? branchColor.bg : theme.inputBorder}`,
                  background: active ? branchColor.bg + "22" : "transparent",
                  color: active ? branchColor.bg : theme.textDim,
                  transition: "all .15s",
                }}>
                  {opt.label}
                </button>
              );
            })}
          </div>
          {repeat?.type === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <span style={{ fontSize: 13, color: theme.textDim }}>Каждые</span>
              <input type="number" min="1" max="365" value={repeatEvery}
                onChange={e => {
                  const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                  setRepeatEvery(v);
                }}
                onBlur={() => {
                  const val = { type: "custom", every: repeatEvery };
                  setRepeat(val);
                  save("repeat", val);
                }}
                className="pi" style={{ width: 72, textAlign: "center" }} />
              <span style={{ fontSize: 13, color: theme.textDim }}>дней</span>
            </div>
          )}
          {repeat && (
            <div style={{ marginTop: 8, fontSize: 12, color: theme.textMuted }}>
              При выполнении срок автоматически перенесётся на следующий цикл
            </div>
          )}
        </div>}

        {/* Description */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.sectionLabel, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.2 }}>Описание</div>
          <textarea className="pi" value={desc}
            onChange={e => {
              setDesc(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            placeholder="Добавить описание…" rows={3}
            ref={el => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
            style={{ resize: "none", minHeight: 60, overflow: "hidden", lineHeight: 1.4 }} />
          {desc !== (node.description || "") && (
            <button onClick={() => save("description", desc)}
              style={{ marginTop: 6, padding: "7px 16px", borderRadius: 8, border: "none", background: "#22c55e", color: "#fff", fontFamily: "'Inter'", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              ✓ Сохранить
            </button>
          )}
        </div>

        {/* Checklist */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.sectionLabel, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.2, display: "flex", alignItems: "center", gap: 8 }}>
            Чеклист {cl.length > 0 && <span style={{ fontSize: 11, color: theme.textFaint, fontWeight: 400, textTransform: "none" }}>{cd}/{cl.length}</span>}
          </div>
          {cl.length > 0 && (
            <div style={{ height: 4, borderRadius: 2, background: theme.progressTrack, marginBottom: 10, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, background: branchColor.bg, width: `${(cd / cl.length) * 100}%`, transition: "width .3s" }} />
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {cl.map(item => (
              <div key={item.id} className="ci">
                <div className={`cb ${item.done ? "dn" : ""}`} onClick={() => toggleCheck(item.id)}>
                  {item.done && <span style={{ color: "#fff", fontSize: 12 }}>✓</span>}
                </div>
                <span style={{ fontSize: 14, flex: 1, textDecoration: item.done ? "line-through" : "none", color: item.done ? theme.textMuted : theme.text }}>{item.text}</span>
                <span className="xb" onClick={() => delCheck(item.id)}>×</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input className="pi" value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === "Enter" && addCheck()} placeholder="Новый пункт…" style={{ flex: 1 }} />
            <button onClick={addCheck} style={{ background: branchColor.bg, border: "none", borderRadius: 8, padding: "0 14px", color: "#fff", fontWeight: 700, fontSize: 18, cursor: "pointer" }}>+</button>
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 20px", borderTop: `1px solid ${theme.surfaceBorderSoft}`, flexShrink: 0 }}>
        <button onClick={() => { onDelete(node.id); onClose(); }}
          style={{ width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${theme.deleteBorder}`, background: theme.deleteBg, color: "#FF5252", fontFamily: "'Inter'", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Удалить задачу
        </button>
      </div>
      </div>
    </>
  );
}

// ── Node Card ──
function NodeCard({ node, colorIdx, level, onNavigate, onEdit, theme, isNew, singleTapEdit, onArchive, onDone }) {
  const c = COLORS[colorIdx % COLORS.length];
  const ad = isAllDone(node);
  const { total, done } = countTasks(node);
  const { total: dkTotal, done: dkDone } = countDirectKids(node);
  const dl = formatDeadline(node.deadline);

  const longPressRef = useRef(null);
  const longPressFiredRef = useRef(false);
  const clickTimerRef = useRef(null);
  const lastPtrType = useRef("mouse");

  const ptrDown = e => {
    lastPtrType.current = e.pointerType;
    if (e.pointerType === "touch") {
      longPressFiredRef.current = false;
      if (singleTapEdit) {
        // родитель: одиночный тап → редактирование, долгий тап не нужен
      } else {
        longPressRef.current = setTimeout(() => { longPressFiredRef.current = true; onEdit?.(); }, 500);
      }
    }
  };
  const ptrUp = () => clearTimeout(longPressRef.current);
  const ptrCancel = () => clearTimeout(longPressRef.current);

  const handleClick = () => {
    if (longPressFiredRef.current) return;
    if (singleTapEdit) {
      // одиночный клик/тап всегда открывает редактирование
      if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
      onEdit?.();
      return;
    }
    if (lastPtrType.current === "touch") { onNavigate?.(); return; }
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      onEdit?.();
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        onNavigate?.();
      }, 240);
    }
  };

  const isCenter = level === 0;
  const accent = ad ? theme.surfaceBorder : c.bg;

  return (
    <div
      onPointerDown={ptrDown} onPointerUp={ptrUp} onPointerCancel={ptrCancel}
      onClick={handleClick}
      style={{
        background: isCenter && !ad
          ? `linear-gradient(135deg, ${c.bg}18, ${c.bg}07)`
          : level === 2 && !ad
          ? (theme.name === "dark" ? `${c.bg}0d` : `${c.bg}08`)
          : theme.surfaceBg,
        border: `1px solid ${isCenter
          ? (ad ? theme.surfaceBorder : c.bg + "32")
          : level === 1
          ? (ad ? theme.surfaceBorder : c.bg + "28")
          : theme.surfaceBorderSoft}`,
        borderLeft: isCenter
          ? `5px solid ${accent}`
          : level === 1
          ? `5px solid ${accent}`
          : `3px solid ${ad ? theme.surfaceBorder : c.bg + "aa"}`,
        borderRadius: isCenter ? 16 : level === 1 ? 13 : 10,
        padding: isCenter
          ? "18px 18px 14px 16px"
          : level === 1 ? "16px 14px 14px 13px" : "9px 11px 8px 9px",
        boxShadow: isCenter
          ? (theme.name === "dark" ? "0 4px 24px rgba(0,0,0,0.3)" : `0 4px 16px ${c.bg}1a`)
          : level === 1
          ? (theme.name === "dark"
              ? `0 3px 14px rgba(0,0,0,0.28), inset 0 0 0 1px ${c.bg}18`
              : `0 2px 10px ${c.bg}18, 0 1px 3px rgba(0,0,0,0.06)`)
          : "none",
        cursor: "pointer",
        userSelect: "none", WebkitUserSelect: "none",
        WebkitTapHighlightColor: "transparent",
        opacity: ad ? 0.48 : 1,
        transition: "opacity .15s",
        display: "flex", flexDirection: "column",
        minHeight: isCenter ? 88 : level === 1 ? 76 : "auto",
        animation: isNew ? "cardIn .25s ease" : undefined,
      }}
      onMouseEnter={e => !ad && (e.currentTarget.style.opacity = "0.82")}
      onMouseLeave={e => (e.currentTarget.style.opacity = ad ? "0.48" : "1")}
    >
      {/* Title */}
      <div style={{
        fontWeight: isCenter ? 700 : level === 1 ? 650 : 600,
        fontSize: isCenter ? 18 : level === 1 ? 15 : 13,
        lineHeight: 1.3,
        color: ad ? theme.textDim : theme.text,
        marginBottom: level < 2 ? 5 : 0,
        display: "-webkit-box",
        WebkitLineClamp: isCenter ? 3 : 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>{node.text}</div>

      {/* Description */}
      {level < 2 && node.description && (
        <div style={{
          fontSize: 12, color: theme.textDim, lineHeight: 1.45,
          flex: 1, marginBottom: 6,
          display: "-webkit-box",
          WebkitLineClamp: isCenter ? 4 : 3,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{node.description}</div>
      )}
      {level < 2 && !node.description && <div style={{ flex: 1 }} />}

      {/* Footer: count · deadline · priority */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: level === 2 && (dl || node.priority) ? 5 : 0 }}>
        {dkTotal > 0 && <span style={{ fontSize: 11, color: theme.textMuted }}>{dkDone}/{dkTotal}</span>}
        {dl && <span style={{ fontSize: 11, fontWeight: 600, color: dl.color || theme.textMuted, marginLeft: total > 0 ? "auto" : 0 }}>{dl.text}</span>}
        {!dl && total > 0 && <div style={{ flex: 1 }} />}
        {node.priority && PRIORITY_COLORS[node.priority] && (
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: PRIORITY_COLORS[node.priority].bg, flexShrink: 0 }} />
        )}
      </div>

      {/* Progress bar */}
      {level < 2 && total > 0 && (
        <div style={{ height: 3, borderRadius: 2, background: theme.progressTrack, overflow: "hidden", marginTop: 8 }}>
          <div style={{ height: "100%", width: `${(done / total) * 100}%`, background: ad ? theme.surfaceBorder : c.bg, borderRadius: "inherit", transition: "width .3s" }} />
        </div>
      )}
      {(node.done || onDone || onArchive) && (
        <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 12 }}>
          {!node.done && onDone && (
            <div
              onClick={e => { e.stopPropagation(); onDone(node.id); }}
              style={{ fontSize: 11, fontWeight: 400, color: "#16a34a", cursor: "pointer", letterSpacing: 0.1 }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Выполнить
            </div>
          )}
          {node.done && !node.archived && onArchive && (
            <div
              onClick={e => { e.stopPropagation(); onArchive(node.id); }}
              style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, cursor: "pointer", letterSpacing: 0.2 }}
              onMouseEnter={e => e.currentTarget.style.color = "#5b3fc4"}
              onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}
            >
              → В архив
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Child column: child card + grandchildren ──
function ChildColumn({ child, childIdx, onNavigate, onNavigateGc, onEdit, theme, newTaskIds, onArchive, onDone }) {
  const [showAll, setShowAll] = useState(false);
  const colorIdx = getNodeColor(child, undefined, childIdx);
  const color = COLORS[colorIdx % COLORS.length];
  const visGC = child.children.filter(c => !c.archived);
  const MAX_GC = 3;
  const shownGC = showAll ? visGC : visGC.slice(0, MAX_GC);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <NodeCard node={child} colorIdx={colorIdx} level={1}
        onNavigate={() => onNavigate(child.id)}
        onEdit={() => onEdit(child.id)}
        theme={theme}
        isNew={newTaskIds?.has(child.id)}
        onArchive={() => onArchive?.(child.id)}
        onDone={() => onDone?.(child.id)} />
      {visGC.length > 0 && (
        <>
          <div style={{ textAlign: "center", color: color.bg + "80", fontSize: 13, padding: "3px 0 2px", userSelect: "none", lineHeight: 1 }}>▾</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {shownGC.map((gc, j) => (
              <NodeCard key={gc.id} node={gc} colorIdx={getNodeColor(gc, colorIdx, j)} level={2}
                onNavigate={() => onNavigateGc(child.id, gc.id)}
                onEdit={() => onEdit(gc.id)}
                theme={theme}
                isNew={newTaskIds?.has(gc.id)}
                onArchive={() => onArchive?.(gc.id)}
                onDone={() => onDone?.(gc.id)} />
            ))}
            {!showAll && visGC.length > MAX_GC && (
              <div onClick={() => setShowAll(true)}
                style={{ textAlign: "center", fontSize: 11, color: theme.textMuted, cursor: "pointer", padding: "5px 0", letterSpacing: 0.5 }}>
                ··· ещё {visGC.length - MAX_GC}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Main ── */
export default function Mindmap({
  maps, activeMapId, onSelectMap, onAddMap, onDeleteMap, onRenameMap,
  onUpdateTree, user, onSignOut, theme, themeName, onToggleTheme,
  nodeShape = "circle", onToggleShape = () => {}, onGoHome,
  taskId, onNavigateTask, onNavigateMap,
  bgUrl, onOpenBgPanel,
}) {
  const [navPath, setNavPath]         = useState(["root"]);
  const [selectedId, setSelectedId]   = useState(null);
  const [overlayMode, setOverlayMode] = useState(null);
  const [newTaskIds, setNewTaskIds]   = useState(() => new Set());

  const winW = useWindowWidth();

  // Ref to avoid double-syncing navPath when we already updated it locally
  const lastSyncedTaskIdRef = useRef(undefined);
  const pendingSelectRef    = useRef(null);

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") setSelectedId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Back button / swipe-back support для модалок (не для страничной навигации)
  const prevSelectedRef = useRef(null);
  const prevOverlayRef  = useRef(null);
  useEffect(() => {
    if (selectedId && !prevSelectedRef.current)
      history.pushState({ modal: "side" }, "", window.location.href);
    prevSelectedRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    if (overlayMode && !prevOverlayRef.current)
      history.pushState({ modal: "overlay" }, "", window.location.href);
    prevOverlayRef.current = overlayMode;
  }, [overlayMode]);
  useEffect(() => {
    const myPath = window.location.pathname;
    const handler = () => {
      // Если URL изменился — это страничная навигация, пусть роутер обработает
      if (window.location.pathname !== myPath) return;
      if (overlayMode) setOverlayMode(null);
      else if (selectedId) setSelectedId(null);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [overlayMode, selectedId]);

  const isMobile  = winW < 720;
  const activeMap = maps.find(m => m.id === activeMapId) || maps[0];
  const tree      = activeMap?.tree;

  const setTree = useCallback(updater => {
    if (!activeMap) return;
    onUpdateTree(activeMap.id, updater);
  }, [activeMap, onUpdateTree]);

  // Сброс при смене карты
  useEffect(() => {
    setNavPath(["root"]);
    lastSyncedTaskIdRef.current = null;
    if (pendingSelectRef.current) { setSelectedId(pendingSelectRef.current); pendingSelectRef.current = null; }
    else setSelectedId(null);
  }, [activeMapId]);

  // Стражник: если текущий узел навигации пропал из дерева — сброс
  useEffect(() => {
    if (!tree) return;
    const lastId = navPath[navPath.length - 1];
    if (!findNode(tree, lastId)) setNavPath(["root"]);
  }, [tree, navPath]);

  // ── Синхронизация navPath с taskId из URL ──
  useEffect(() => {
    if (!tree) return;
    // Не синхронизируем повторно то, что уже применили локально
    if (taskId === lastSyncedTaskIdRef.current) return;
    lastSyncedTaskIdRef.current = taskId;
    if (!taskId) {
      setNavPath(["root"]);
    } else {
      const found = findPath(tree, taskId);
      if (found) setNavPath(found);
    }
  }, [taskId, tree]);

  // ── Навигация ──
  const navigateUp = useCallback(() => {
    let shouldBack = false;
    setNavPath(prev => {
      if (prev.length <= 1) return prev;
      shouldBack = true;
      const newPath = prev.slice(0, -1);
      // null означает «в корне» (URL /:pid без taskId)
      const newTid = newPath.length > 1 ? newPath[newPath.length - 1] : null;
      lastSyncedTaskIdRef.current = newTid;
      return newPath;
    });
    setSelectedId(null);
    if (shouldBack) history.back();
  }, []);

  const navigateInto = useCallback((childId) => {
    setNavPath(prev => [...prev, childId]);
    setSelectedId(null);
    lastSyncedTaskIdRef.current = childId;
    onNavigateTask?.(activeMapId, childId);
  }, [activeMapId, onNavigateTask]);

  const navigateIntoGc = useCallback((parentId, gcId) => {
    setNavPath(prev => [...prev, parentId, gcId]);
    setSelectedId(null);
    lastSyncedTaskIdRef.current = gcId;
    // Два pushState: пользователь сможет вернуться через parentId
    onNavigateTask?.(activeMapId, parentId);
    onNavigateTask?.(activeMapId, gcId);
  }, [activeMapId, onNavigateTask]);

  const goToTask = useCallback((mapId, taskIdArg) => {
    if (mapId !== activeMapId) { pendingSelectRef.current = taskIdArg; onSelectMap(mapId); }
    else setSelectedId(taskIdArg);
    setOverlayMode(null);
  }, [activeMapId, onSelectMap]);

  const restoreTask = useCallback((mapId, taskIdArg) => {
    onUpdateTree(mapId, t => updateNode(t, taskIdArg, n => ({ ...setAllDone(n, false), archived: false })));
  }, [onUpdateTree]);

  const handleAdd = useCallback((pid) => {
    const newId = genId();
    setTree(t => addChild(t, pid, { id: newId, text: "Новая задача", done: false, description: "", checklist: [], children: [] }));
    setNewTaskIds(prev => new Set([...prev, newId]));
    setTimeout(() => setNewTaskIds(prev => { const s = new Set(prev); s.delete(newId); return s; }), 600);
  }, [setTree]);

  const handleDelete = useCallback((id) => {
    setTree(t => removeNode(t, id));
    setSelectedId(s => s === id ? null : s);
    setNavPath(prev => {
      const idx = prev.indexOf(id);
      return idx === -1 ? prev : prev.slice(0, Math.max(1, idx));
    });
  }, [setTree]);

  const handleArchive = useCallback((id) => {
    setTree(t => updateNode(t, id, n => ({ ...n, archived: true, done: true })));
  }, [setTree]);

  const handleDone = useCallback((id) => {
    setTree(t => updateNode(t, id, n => ({ ...n, done: true })));
  }, [setTree]);

  if (!tree) {
    return <div style={{ width: "100%", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: theme.appBg, color: theme.textMuted, fontFamily: "'Inter',sans-serif" }}>Загрузка…</div>;
  }

  const navNodeId  = navPath[navPath.length - 1];
  const navNode    = findNode(tree, navNodeId) || tree;
  const visChildren   = navNode.children.filter(c => !c.archived);
  const archivedCount = navNode.children.filter(c => c.archived).length;

  const editNodeId = selectedId || navNodeId;
  const editNode   = findNode(tree, editNodeId);
  const panelOpen  = !!editNode;

  const centerColorIdx = navNode.colorIdx ?? 0;
  const centerColor    = COLORS[centerColorIdx % COLORS.length];

  const STATS_W  = 260;
  const contentW = winW - (!isMobile ? STATS_W : 0);
  const numCols  = isMobile ? 2 : Math.max(2, Math.min(4, Math.floor(contentW / 260)));

  return (
    <div style={{
      position: "fixed", inset: 0,
      paddingTop: "env(safe-area-inset-top)",
      background: bgUrl
        ? (themeName === "dark" ? "rgba(10,10,20,0.72)" : "rgba(238,242,255,0.72)")
        : theme.appBg,
      color: theme.text,              /* ← исправляет цвет «indes» в светлой теме */
      fontFamily: "'Inter', sans-serif",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      animation: "pageIn .2s ease",
      zIndex: 1,
    }}>

      {/* Header */}
      <MapHeader maps={maps} activeId={activeMapId} user={user} onSignOut={onSignOut}
        theme={theme} themeName={themeName} onToggleTheme={onToggleTheme}
        onOpenToday={() => setOverlayMode("today")}
        onOpenArchive={() => setOverlayMode("archive")}
        onGoHome={onGoHome} onOpenBgPanel={onOpenBgPanel} />

      {/* Breadcrumb */}
      <div style={{ flexShrink: 0, height: 40, display: "flex", alignItems: "center", padding: "0 12px", gap: 2, background: theme.panelTabBg, borderBottom: `1px solid ${theme.surfaceBorderSoft}` }}>
        {navPath.length > 1 && (
          <button onClick={navigateUp} style={{ background: "none", border: "none", color: theme.textDim, fontFamily: "'Inter'", fontSize: 18, cursor: "pointer", padding: "0 6px 0 0", lineHeight: 1, flexShrink: 0 }}>‹</button>
        )}
        {navPath.map((id, i) => {
          const n = findNode(tree, id);
          const isLast = i === navPath.length - 1;
          return (
            <Fragment key={id}>
              {i > 0 && <span style={{ color: theme.textFaint, fontSize: 13, flexShrink: 0 }}>›</span>}
              <button
                onClick={() => {
                  if (isLast) return;
                  const newPath = navPath.slice(0, i + 1);
                  const newTid = newPath.length > 1 ? newPath[newPath.length - 1] : null;
                  lastSyncedTaskIdRef.current = newTid;
                  setNavPath(newPath);
                  if (newTid) onNavigateTask?.(activeMapId, newTid);
                  else onNavigateMap?.(activeMapId);
                }}
                style={{ background: "none", border: "none", color: isLast ? theme.text : theme.textDim, fontFamily: "'Inter'", fontSize: 13, fontWeight: isLast ? 700 : 500, cursor: isLast ? "default" : "pointer", padding: "2px 4px", borderRadius: 4, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: i === 0 ? 0 : 1 }}>
                {n?.text || id}
              </button>
            </Fragment>
          );
        })}
        <span style={{ fontSize: 11, color: theme.textHint, marginLeft: "auto", flexShrink: 0, paddingRight: 4, whiteSpace: "nowrap" }}>
          {isMobile ? "долгий тап — изменить" : "двойной клик — изменить"}
        </span>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 80px" }}>

          {/* Center card */}
          <NodeCard node={navNode} colorIdx={centerColorIdx} level={0}
            onNavigate={undefined}
            onEdit={() => setSelectedId(navNodeId)}
            theme={theme}
            singleTapEdit />

          {/* Chevron row */}
          {visChildren.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-around", padding: "8px 0 4px", gap: 4 }}>
              {Array.from({ length: Math.min(visChildren.length, numCols * 2) }).map((_, i) => (
                <span key={i} style={{ color: centerColor.bg + "66", fontSize: 16, userSelect: "none", lineHeight: 1 }}>▾</span>
              ))}
            </div>
          )}

          {/* Children grid */}
          {visChildren.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${numCols}, 1fr)`, columnGap: 12, rowGap: 28, marginTop: 4 }}>
              {visChildren.map((child, i) => (
                <ChildColumn key={child.id}
                  child={child} childIdx={i}
                  onNavigate={navigateInto}
                  onNavigateGc={navigateIntoGc}
                  onEdit={id => setSelectedId(id)}
                  theme={theme}
                  newTaskIds={newTaskIds}
                  onArchive={handleArchive}
                  onDone={handleDone} />
              ))}
            </div>
          )}

          {/* Кнопка добавить — только на мобиле (на десктопе — в панели статистики) */}
          {isMobile && <button onClick={() => handleAdd(navNodeId)} style={{
            marginTop: 16, width: "100%", padding: "11px", borderRadius: 12,
            border: `1.5px dashed ${theme.surfaceBorder}`, background: "transparent",
            color: theme.textMuted, fontFamily: "'Inter'", fontWeight: 600, fontSize: 13,
            cursor: "pointer", transition: "border-color .15s, color .15s",
            letterSpacing: 0.3,
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = theme.textDim; e.currentTarget.style.color = theme.text; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.surfaceBorder; e.currentTarget.style.color = theme.textMuted; }}>
            + Добавить задачу
          </button>}

          {/* Архивированные (если есть) */}
          {archivedCount > 0 && (
            <div style={{ marginTop: 14, fontSize: 11, color: theme.textHint, textAlign: "center", letterSpacing: 0.3 }}>
              {archivedCount} в архиве · скрыто
            </div>
          )}
        </div>

        {/* Desktop stats panel */}
        {!isMobile && (
          <BranchStats node={navNode} theme={theme} onAdd={() => handleAdd(navNodeId)} />
        )}
      </div>

      {/* Edit sheet modal — same for mobile and desktop */}
      {selectedId && editNode && (
        <SidePanel node={editNode} tree={tree} setTree={setTree}
          onClose={() => setSelectedId(null)}
          onDelete={handleDelete}
          theme={theme} isMobile={isMobile} />
      )}

      {/* Overlay: Today */}
      {overlayMode === "today" && (() => {
        const items = collectByDeadline(maps);
        const overdue = items.filter(i => i.bucket === "overdue");
        const today = items.filter(i => i.bucket === "today");
        const week = items.filter(i => i.bucket === "week");
        const Section = ({ title, list }) => (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: theme.sectionLabel, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>
              {title} {list.length > 0 && <span style={{ color: theme.textFaint, fontWeight: 400 }}>· {list.length}</span>}
            </div>
            {list.length === 0
              ? <div style={{ color: theme.textDim, fontSize: 13, padding: "8px 0" }}>—</div>
              : list.map(t => {
                const co = COLORS[(t.colorIdx ?? 0) % COLORS.length];
                const dl = formatDeadline(t.deadline);
                return (
                  <div key={`${t.mapId}/${t.id}`} onClick={() => goToTask(t.mapId, t.id)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", marginBottom: 4, background: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 10, cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = theme.surfaceBgHover}
                    onMouseLeave={e => e.currentTarget.style.background = theme.surfaceBg}>
                    <div style={{ width: 8, height: 36, borderRadius: 4, background: co.bg, flexShrink: 0 }} />
                    {t.priority && PRIORITY_COLORS[t.priority] && <div style={{ width: 8, height: 8, borderRadius: "50%", background: PRIORITY_COLORS[t.priority].bg, flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text}</div>
                      <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>{t.mapName}</div>
                    </div>
                    {dl && <div style={{ fontSize: 12, fontWeight: 600, color: dl.color || theme.textDim, flexShrink: 0 }}>{dl.text}</div>}
                  </div>
                );
              })}
          </div>
        );
        return (
          <OverlayList title="Сегодня" theme={theme} onClose={() => setOverlayMode(null)}>
            {items.length === 0
              ? <div style={{ color: theme.textDim, padding: 30, textAlign: "center" }}>Нет задач со сроком в ближайшую неделю</div>
              : <><Section title="Просрочено" list={overdue} /><Section title="Сегодня" list={today} /><Section title="На неделе" list={week} /></>}
          </OverlayList>
        );
      })()}

      {/* Overlay: Archive */}
      {overlayMode === "archive" && (() => {
        const items = collectArchived(maps);
        return (
          <OverlayList title="Архив" theme={theme} onClose={() => setOverlayMode(null)}>
            {items.length === 0
              ? <div style={{ color: theme.textDim, padding: 30, textAlign: "center" }}>Архив пуст.</div>
              : items.map(t => {
                const co = COLORS[(t.colorIdx ?? 0) % COLORS.length];
                return (
                  <div key={`${t.mapId}/${t.id}`}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", marginBottom: 4, background: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 10 }}>
                    <div style={{ width: 8, height: 36, borderRadius: 4, background: co.bg, flexShrink: 0, opacity: 0.5 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: theme.textDim, textDecoration: "line-through", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text}</div>
                      <div style={{ fontSize: 11, color: theme.textFaint, marginTop: 2 }}>{t.mapName}</div>
                    </div>
                    <button onClick={() => restoreTask(t.mapId, t.id)}
                      style={{ background: "transparent", border: `1px solid ${co.bg}`, color: co.bg, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "'Inter'", fontSize: 12, fontWeight: 700 }}>
                      Восстановить
                    </button>
                  </div>
                );
              })}
          </OverlayList>
        );
      })()}
    </div>
  );
}
