import { useState, useEffect, useRef } from "react";
import { useWindowWidth } from "./hooks";
import { AppHeader, AppOverlay } from "./ui";
import {
  COLORS, PRIORITY_COLORS, toLocalInput, fromLocalInput, formatDeadline,
  countTasks, countDirectKids,
  collectByDeadline, collectArchived, collectByPriority,
  updateNode, setAllDone,
} from "./utils";

const PRIORITY_OPTIONS = [
  { value: null,     label: "Без приоритета", color: "transparent", border: true },
  { value: "low",    label: "Низкий",         color: "#4CAF50" },
  { value: "medium", label: "Средний",        color: "#FFC107" },
  { value: "high",   label: "Высокий",        color: "#F44336" },
];


// Считаем задачи по приоритетам рекурсивно (только для StatsBar)
function countByPriority(node) {
  const out = { high: 0, medium: 0, low: 0, none: 0 };
  const walk = n => {
    if (!n.done) {
      if (n.priority === "high")        out.high++;
      else if (n.priority === "medium") out.medium++;
      else if (n.priority === "low")    out.low++;
      else                              out.none++;
    }
    for (const c of n.children || []) walk(c);
  };
  walk(node);
  return out;
}

// ── Stats bar (desktop) ──
function StatsBar({ maps, overdue, today, theme, onOpenPriorities }) {
  let totalTasks = 0, totalDone = 0;
  const pri = { high: 0, medium: 0, low: 0, none: 0 };
  maps.forEach(m => {
    if (m.tree) {
      const r = countTasks(m.tree);
      totalTasks += r.total; totalDone += r.done;
      const p = countByPriority(m.tree);
      pri.high += p.high; pri.medium += p.medium; pri.low += p.low; pri.none += p.none;
    }
  });
  const priTotal = pri.high + pri.medium + pri.low;

  const chips = [
    { label: "Проектов",  value: maps.length,    color: "#5b3fc4" },
    { label: "Выполнено", value: `${totalDone} / ${totalTasks}`, color: "#22c55e" },
    { label: "Просрочено",value: overdue.length,  color: overdue.length ? "#F44336" : theme.textMuted },
    { label: "Сегодня",   value: today.length,    color: today.length   ? "#FB8C00" : theme.textMuted },
  ];
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "stretch" }}>
      {chips.map(ch => (
        <div key={ch.label} style={{
          flex: "1 1 100px", background: theme.surfaceBg,
          border: `1px solid ${theme.surfaceBorderSoft}`, borderRadius: 12, padding: "12px 16px",
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: ch.color, lineHeight: 1 }}>{ch.value}</div>
          <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4, fontWeight: 500 }}>{ch.label}</div>
        </div>
      ))}
      {/* Шкала приоритетов */}
      <div onClick={onOpenPriorities} style={{
        flex: "2 1 180px", background: theme.surfaceBg,
        border: `1px solid ${theme.surfaceBorderSoft}`, borderRadius: 12, padding: "12px 16px",
        display: "flex", flexDirection: "column", justifyContent: "center",
        cursor: onOpenPriorities ? "pointer" : "default",
        transition: "background .12s",
      }}
      onMouseEnter={e => { if (onOpenPriorities) e.currentTarget.style.background = theme.surfaceBgHover; }}
      onMouseLeave={e => { if (onOpenPriorities) e.currentTarget.style.background = theme.surfaceBg; }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: theme.textDim, fontWeight: 500 }}>Приоритеты</span>
          {priTotal > 0 ? (
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.5px" }}>
              <span style={{ color: "#F44336" }}>{pri.high}</span>
              <span style={{ color: theme.textFaint }}> / </span>
              <span style={{ color: "#FFC107" }}>{pri.medium}</span>
              <span style={{ color: theme.textFaint }}> / </span>
              <span style={{ color: "#4CAF50" }}>{pri.low}</span>
            </span>
          ) : (
            <span style={{ fontSize: 12, color: theme.textMuted }}>—</span>
          )}
        </div>
        {priTotal > 0 ? (
          <div style={{ height: 6, borderRadius: 3, overflow: "hidden", display: "flex" }}>
            {pri.high   > 0 && <div style={{ width: `${(pri.high   / priTotal) * 100}%`, height: "100%", background: "#F44336", transition: "width .5s" }} />}
            {pri.medium > 0 && <div style={{ width: `${(pri.medium / priTotal) * 100}%`, height: "100%", background: "#FFC107", transition: "width .5s" }} />}
            {pri.low    > 0 && <div style={{ width: `${(pri.low    / priTotal) * 100}%`, height: "100%", background: "#4CAF50", transition: "width .5s" }} />}
          </div>
        ) : (
          <div style={{ height: 6, borderRadius: 3, background: theme.progressTrack }} />
        )}
      </div>
    </div>
  );
}

// ── Projects overview (desktop) ──
function ProjectsOverview({ maps, theme, onOpenMap }) {
  if (!maps.length) return null;
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: theme.sectionLabel, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10 }}>
        Прогресс (все задачи)
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {maps.map((map, idx) => {
          const { total, done } = countTasks(map.tree || { children: [] });
          const colorIdx = (map.tree?.colorIdx !== undefined && map.tree?.colorIdx !== null) ? map.tree.colorIdx : idx;
          const c = COLORS[colorIdx % COLORS.length];
          const pct = total ? Math.round((done / total) * 100) : 0;
          return (
            <div key={map.id} onClick={() => onOpenMap(map.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 10px", borderRadius: 10, cursor: "pointer", transition: "background .12s" }}
              onMouseEnter={e => e.currentTarget.style.background = theme.surfaceBgHover}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.bg, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{map.name}</span>
                  <span style={{ fontSize: 11, color: theme.textMuted, flexShrink: 0, marginLeft: 10 }}>{done}/{total}</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: theme.progressTrack, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: c.bg, borderRadius: 2, transition: "width .5s" }} />
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? "#22c55e" : theme.textMuted, flexShrink: 0, width: 32, textAlign: "right" }}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Project card ──
function ProjectCard({ map, colorIdx: fallbackIdx, theme, onOpen, onEdit, isDesktop }) {
  const resolvedIdx = (map.tree?.colorIdx !== undefined && map.tree?.colorIdx !== null)
    ? map.tree.colorIdx : fallbackIdx;
  const c = COLORS[resolvedIdx % COLORS.length];
  const { total, done } = countDirectKids(map.tree);  // только прямые дети
  const { total: totalAll, done: doneAll } = countTasks(map.tree); // для прогресс-бара
  const deadline = map.tree?.deadline || null;
  const dlFmt = formatDeadline(deadline);
  const priority = map.tree?.priority || null;
  const desc = map.tree?.description || "";

  const longRef = useRef(null);
  const didLong = useRef(false);
  const clickTimerRef = useRef(null);

  const onPointerDown = (e) => {
    didLong.current = false;
    if (e.pointerType === "touch") {
      longRef.current = setTimeout(() => { didLong.current = true; onEdit(); }, 500);
    }
  };
  const onPointerUp = () => clearTimeout(longRef.current);
  const onPointerCancel = () => clearTimeout(longRef.current);

  const handleClick = () => {
    if (didLong.current) return;
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      onEdit();
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        onOpen();
      }, 240);
    }
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={handleClick}
      style={{
        background: theme.surfaceBg,
        borderRadius: 14,
        border: `1px solid ${theme.surfaceBorder}`,
        borderLeft: `4px solid ${c.bg}`,
        padding: "14px 14px 12px 12px",
        cursor: "pointer",
        minHeight: isDesktop ? 210 : 150,
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTapHighlightColor: "transparent",
        boxShadow: theme.name === "dark"
          ? "0 2px 12px rgba(0,0,0,0.28)"
          : "0 1px 6px rgba(0,0,0,0.07)",
        transition: "opacity .12s",
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
    >
      {/* Title */}
      <div style={{
        fontWeight: 700, fontSize: 15, lineHeight: 1.3, color: theme.text,
        marginBottom: 6,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>{map.name}</div>

      {/* Description */}
      {desc && (
        <div style={{
          fontSize: 12, color: theme.textDim, lineHeight: 1.4, flex: 1, marginBottom: 8,
          display: "-webkit-box", WebkitLineClamp: isDesktop ? 6 : 3, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{desc}</div>
      )}
      {!desc && <div style={{ flex: 1 }} />}

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {total > 0 && <span style={{ fontSize: 11, color: theme.textMuted }}>{done}/{total}</span>}
        {dlFmt && (
          <span style={{ fontSize: 11, fontWeight: 600, color: dlFmt.color || theme.textDim, marginLeft: total > 0 ? "auto" : 0 }}>
            {dlFmt.text}
          </span>
        )}
        {!dlFmt && total > 0 && <div style={{ flex: 1 }} />}
        {priority && PRIORITY_COLORS[priority] && (
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: PRIORITY_COLORS[priority].bg, flexShrink: 0 }} />
        )}
      </div>

      {/* Progress bar */}
      {totalAll > 0 && (
        <div style={{ height: 3, borderRadius: 2, background: theme.progressTrack, overflow: "hidden", marginTop: 8 }}>
          <div style={{ height: "100%", width: `${(doneAll / totalAll) * 100}%`, background: c.bg, borderRadius: "inherit", transition: "width .3s" }} />
        </div>
      )}
    </div>
  );
}

// ── Add card ──
function AddCard({ theme, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 14,
        border: `1.5px dashed ${theme.surfaceBorder}`,
        background: "transparent",
        minHeight: 150,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        cursor: "pointer",
        transition: "border-color .15s, background .15s",
        WebkitTapHighlightColor: "transparent",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = theme.textDim; e.currentTarget.style.background = theme.surfaceBgHover; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = theme.surfaceBorder; e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ fontSize: 28, fontWeight: 300, color: theme.textMuted, lineHeight: 1 }}>+</span>
      <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: "'Inter',sans-serif" }}>Новый проект</span>
    </div>
  );
}

// ── Deadline task row ──
function DeadlineRow({ task, mapColorIdx, theme, onNavigateTask }) {
  const c = COLORS[(mapColorIdx ?? task.colorIdx ?? 0) % COLORS.length];
  const dl = formatDeadline(task.deadline);
  return (
    <div
      onClick={() => onNavigateTask?.(task.mapId, task.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 12,
        background: theme.surfaceBg,
        border: `1px solid ${theme.surfaceBorderSoft}`,
        cursor: "pointer",
        transition: "background .12s",
        WebkitTapHighlightColor: "transparent",
      }}
      onMouseEnter={e => e.currentTarget.style.background = theme.surfaceBgHover}
      onMouseLeave={e => e.currentTarget.style.background = theme.surfaceBg}
    >
      <div style={{ width: 4, alignSelf: "stretch", borderRadius: 2, background: c.bg, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: theme.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {task.text}
        </div>
        <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>{task.mapName}</div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: dl.color || theme.textDim, flexShrink: 0 }}>
        {dl.text}
      </div>
    </div>
  );
}

// ── Deadline section ──
function DeadlineSection({ title, tasks, maps, theme, onNavigateTask }) {
  if (tasks.length === 0) return null;
  const mapColorMap = Object.fromEntries(maps.map((m, i) => [m.id, i]));
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: theme.text, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {tasks.map(t => (
          <DeadlineRow key={t.id} task={t} mapColorIdx={mapColorMap[t.mapId]} theme={theme} onNavigateTask={onNavigateTask} />
        ))}
      </div>
    </div>
  );
}

// ── Edit modal ──
function EditModal({ map, theme, onSave, onDelete, onClose }) {
  const [name,     setName]     = useState(map.name || "");
  const [desc,     setDesc]     = useState(map.description || "");
  const [deadline, setDeadline] = useState(toLocalInput(map.deadline));
  const [priority, setPriority] = useState(map.priority || null);
  const [colorIdx, setColorIdx] = useState(map.colorIdx !== undefined ? map.colorIdx : 0);
  const [confirm,  setConfirm]  = useState(false);
  const touchStartY = useRef(0);
  const onTouchStart = e => { touchStartY.current = e.touches[0].clientY; };
  const onTouchEnd = e => { if (e.changedTouches[0].clientY - touchStartY.current > 80) onClose(); };

  const inp = { width: "100%", padding: "10px 12px", borderRadius: 10,
    border: `1.5px solid ${theme.inputBorder}`, background: theme.inputBg,
    color: theme.text, fontSize: 14, fontFamily: "'Inter', sans-serif",
    outline: "none", boxSizing: "border-box" };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: desc, deadline: fromLocalInput(deadline), priority, colorIdx });
  };

  const winW = useWindowWidth();
  const isDesktop = winW >= 720;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.45)", animation: "fadeIn .2s ease" }} />
      <div onClick={e => e.stopPropagation()} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{
        position: "fixed", zIndex: 101,
        background: theme.panelBg,
        display: "flex", flexDirection: "column", gap: 10,
        maxHeight: isDesktop ? "88vh" : "92vh",
        overflowY: "auto",
        ...(isDesktop ? {
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 520,
          borderRadius: 20,
          padding: "24px 24px 28px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.32)",
        } : {
          bottom: 0, left: 0, right: 0,
          borderRadius: "20px 20px 0 0",
          padding: "8px 20px 32px",
        }),
      }}>
        {!isDesktop && <div style={{ width: 44, height: 4, borderRadius: 2, background: theme.surfaceBorder, margin: "8px auto 16px", flexShrink: 0 }} />}
        <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 2 }}>Редактировать проект</div>

        {/* Название */}
        <label style={{ fontSize: 12, color: theme.textDim, fontWeight: 600 }}>Название</label>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus style={inp}
          onKeyDown={e => e.key === "Enter" && handleSave()} />

        {/* Цвет */}
        <label style={{ fontSize: 12, color: theme.textDim, fontWeight: 600 }}>Цвет</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {COLORS.map((co, i) => (
            <div key={i} onClick={() => setColorIdx(i)}
              style={{
                width: 30, height: 30, borderRadius: 8, background: co.bg, cursor: "pointer", flexShrink: 0,
                outline: i === colorIdx ? `3px solid ${theme.name === "dark" ? "#fff" : "#333"}` : "3px solid transparent",
                outlineOffset: 2,
                transition: "transform .12s",
                transform: i === colorIdx ? "scale(1.18)" : "scale(1)",
              }}
              onMouseEnter={e => { if (i !== colorIdx) e.currentTarget.style.transform = "scale(1.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = i === colorIdx ? "scale(1.18)" : "scale(1)"; }}
            />
          ))}
        </div>

        {/* Описание */}
        <label style={{ fontSize: 12, color: theme.textDim, fontWeight: 600 }}>Описание</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{
          ...inp, resize: "vertical", lineHeight: 1.5,
        }} />

        {/* Срок */}
        <label style={{ fontSize: 12, color: theme.textDim, fontWeight: 600 }}>Срок</label>
        <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} style={inp} />

        {/* Приоритет */}
        <label style={{ fontSize: 12, color: theme.textDim, fontWeight: 600 }}>Приоритет</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PRIORITY_OPTIONS.map(o => (
            <button key={String(o.value)} onClick={() => setPriority(o.value)}
              style={{
                flex: 1, padding: "8px 6px", borderRadius: 10, cursor: "pointer",
                fontFamily: "'Inter'", fontSize: 13, fontWeight: 600,
                border: priority === o.value ? `2px solid ${o.color || theme.surfaceBorder}` : `1.5px solid ${theme.surfaceBorder}`,
                background: priority === o.value ? (o.color ? `${o.color}22` : theme.surfaceBgHover) : "transparent",
                color: priority === o.value && o.color ? o.color : theme.textDim,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
              {o.color !== "transparent" && <span style={{ width: 8, height: 8, borderRadius: "50%", background: o.color, display: "inline-block" }} />}
              {o.label}
            </button>
          ))}
        </div>

        {/* Сохранить */}
        <button onClick={handleSave} style={{
          marginTop: 4, padding: "12px", borderRadius: 12, border: "none",
          background: "#1E88E5", color: "#fff",
          fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer",
        }}>Сохранить</button>

        {/* Удалить */}
        {!confirm ? (
          <button onClick={() => setConfirm(true)} style={{
            padding: "12px", borderRadius: 12, border: `1px solid ${theme.deleteBorder}`,
            background: theme.deleteBg, color: "#F44336",
            fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer",
          }}>Удалить проект</button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onDelete} style={{
              flex: 1, padding: "11px", borderRadius: 12, border: "none",
              background: "#F44336", color: "#fff",
              fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              Да, удалить
            </button>
            <button onClick={() => setConfirm(false)} style={{
              flex: 1, padding: "11px", borderRadius: 12,
              border: `1px solid ${theme.surfaceBorder}`, background: "transparent", color: theme.textDim,
              fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              Отмена
            </button>
          </div>
        )}
      </div>
    </>
  );
}



// ── Main component ──
export default function ProjectsHome({ maps, theme, themeName, onToggleTheme, onOpenMap, onGoHome, onAddMap, onDeleteMap, onRenameMap, onUpdateTree, user, onSignOut, onNavigateTask, initialOverlay, onOverlayClose, bgUrl, onOpenBgPanel }) {
  const [editing, setEditing] = useState(null);
  const [overlayMode, setOverlayMode] = useState(initialOverlay || null);

  const winW = useWindowWidth();

  const restoreTask = (mapId, taskId) => {
    onUpdateTree(mapId, t => updateNode(t, taskId, n => ({ ...setAllDone(n, false), archived: false })));
  };

  // Back button / swipe-back для модалок
  const prevEditingRef = useRef(null);
  const prevOverlayRef = useRef(null);
  useEffect(() => {
    if (editing && !prevEditingRef.current)
      history.pushState({ modal: "edit" }, "", window.location.href);
    prevEditingRef.current = editing;
  }, [editing]);
  useEffect(() => {
    if (overlayMode && !prevOverlayRef.current)
      history.pushState({ modal: "overlay" }, "", window.location.href);
    prevOverlayRef.current = overlayMode;
  }, [overlayMode]);
  useEffect(() => {
    const myPath = window.location.pathname;
    const handler = () => {
      if (window.location.pathname !== myPath) return;
      if (overlayMode) setOverlayMode(null);
      else if (editing) setEditing(null);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [overlayMode, editing]);

  const isDesktop = winW >= 720;

  const deadlineTasks = collectByDeadline(maps);
  const overdue = deadlineTasks.filter(t => t.bucket === "overdue");
  const today  = deadlineTasks.filter(t => t.bucket === "today");
  const week   = deadlineTasks.filter(t => t.bucket === "week");
  const hasDeadlines = overdue.length + today.length + week.length > 0;

  const cardCols = isDesktop
    ? `repeat(auto-fill, minmax(210px, 1fr))`
    : `repeat(auto-fill, minmax(150px, 1fr))`;

  const deadlinePanel = (
    <div>
      {hasDeadlines ? (
        <>
          <DeadlineSection title="Просрочено:" tasks={overdue} maps={maps} theme={theme} onNavigateTask={onNavigateTask} />
          <DeadlineSection title="Сегодня:"    tasks={today}  maps={maps} theme={theme} onNavigateTask={onNavigateTask} />
          <DeadlineSection title="На неделе:"  tasks={week}   maps={maps} theme={theme} onNavigateTask={onNavigateTask} />
        </>
      ) : (
        <div style={{ fontSize: 13, color: theme.textMuted, padding: "4px 0 8px" }}>Нет ближайших задач</div>
      )}
    </div>
  );

  const closeOverlay = () => {
    setOverlayMode(null);
    onOverlayClose?.();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bgUrl
          ? (themeName === "dark" ? "rgba(10,10,20,0.72)" : "rgba(238,242,255,0.72)")
          : theme.appBg,
        fontFamily: "'Inter', sans-serif",
        color: theme.text, position: "relative", animation: "pageIn .2s ease",
        zIndex: 1,
      }}
    >
      {/* Header */}
      <AppHeader
        sticky
        theme={theme} themeName={themeName} onToggleTheme={onToggleTheme}
        onSignOut={onSignOut} onGoHome={onGoHome} onOpenBgPanel={onOpenBgPanel}
        onToday={() => setOverlayMode("today")}
        onArchive={() => setOverlayMode("archive")}
        user={user}
      />

      {/* Content */}
      <div style={{
        display: "flex",
        flexDirection: isDesktop ? "row" : "column",
        gap: 28,
        padding: "0 20px 32px",
        alignItems: "flex-start",
      }}>
        {/* Cards */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Stats bar — только десктоп */}
          {isDesktop && (
            <StatsBar maps={maps} overdue={overdue} today={today} theme={theme} onOpenPriorities={() => setOverlayMode("priorities")} />
          )}

          <div style={{ display: "grid", gridTemplateColumns: cardCols, gap: 12 }}>
            {maps.map((map, idx) => (
              <ProjectCard
                key={map.id}
                map={map}
                colorIdx={idx}
                theme={theme}
                isDesktop={isDesktop}
                onOpen={() => onOpenMap(map.id)}
                onEdit={() => setEditing({
                  id: map.id,
                  name: map.name,
                  description: map.tree?.description || "",
                  deadline: map.tree?.deadline || null,
                  priority: map.tree?.priority || null,
                  colorIdx: (map.tree?.colorIdx !== undefined && map.tree?.colorIdx !== null)
                    ? map.tree.colorIdx : idx,
                })}
              />
            ))}
            <AddCard theme={theme} onClick={onAddMap} />
          </div>

          {/* Обзор прогресса — только десктоп */}
          {isDesktop && (
            <ProjectsOverview maps={maps} theme={theme} onOpenMap={onOpenMap} />
          )}

          {/* Deadline panel below cards on mobile */}
          {!isDesktop && (
            <div style={{ marginTop: 28 }}>{deadlinePanel}</div>
          )}

          {/* Статистика на мобайле — после всех блоков */}
          {!isDesktop && (
            <>
              <StatsBar maps={maps} overdue={overdue} today={today} theme={theme} onOpenPriorities={() => setOverlayMode("priorities")} />
              <ProjectsOverview maps={maps} theme={theme} onOpenMap={onOpenMap} />
            </>
          )}
        </div>

        {/* Deadline panel — sticky right sidebar on desktop */}
        {isDesktop && (
          <div style={{
            flexShrink: 0, width: 300,
            position: "sticky", top: "calc(72px + env(safe-area-inset-top))", alignSelf: "flex-start", // 56px header + 16px gap
            maxHeight: "calc(100vh - 90px)", overflowY: "auto",
          }}>{deadlinePanel}</div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <EditModal
          map={editing}
          theme={theme}
          onSave={(fields) => {
            onRenameMap(editing.id, fields.name);
            onUpdateTree(editing.id, tree => ({
              ...tree,
              description: fields.description,
              deadline: fields.deadline,
              priority: fields.priority,
              colorIdx: fields.colorIdx,
            }));
            setEditing(null);
          }}
          onDelete={() => { onDeleteMap(editing.id); setEditing(null); }}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Overlay: Сегодня */}
      {overlayMode === "today" && (() => {
        // Используем уже вычисленные выше overdue / today / week
        const overdue2 = overdue;
        const today2   = today;
        const week2    = week;
        const items    = deadlineTasks;
        const Section = ({ title: t, list }) => (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: theme.sectionLabel, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>
              {t} {list.length > 0 && <span style={{ color: theme.textFaint, fontWeight: 400 }}>· {list.length}</span>}
            </div>
            {list.length === 0
              ? <div style={{ color: theme.textDim, fontSize: 13, padding: "8px 0" }}>—</div>
              : list.map(task => {
                const co = COLORS[(task.colorIdx ?? 0) % COLORS.length];
                const dl = formatDeadline(task.deadline);
                return (
                  <div key={`${task.mapId}/${task.id}`} onClick={() => { onNavigateTask?.(task.mapId, task.id); setOverlayMode(null); }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", marginBottom: 4, background: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 10, cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = theme.surfaceBgHover}
                    onMouseLeave={e => e.currentTarget.style.background = theme.surfaceBg}>
                    <div style={{ width: 8, height: 36, borderRadius: 4, background: co.bg, flexShrink: 0 }} />
                    {task.priority && PRIORITY_COLORS[task.priority] && <div style={{ width: 8, height: 8, borderRadius: "50%", background: PRIORITY_COLORS[task.priority].bg, flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.text}</div>
                      <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>{task.mapName}</div>
                    </div>
                    {dl && <div style={{ fontSize: 12, fontWeight: 600, color: dl.color || theme.textDim, flexShrink: 0 }}>{dl.text}</div>}
                  </div>
                );
              })}
          </div>
        );
        return (
          <AppOverlay title="Сегодня" theme={theme} onClose={closeOverlay}>
            {items.length === 0
              ? <div style={{ color: theme.textDim, padding: 30, textAlign: "center" }}>Нет задач со сроком в ближайшую неделю</div>
              : <><Section title="Просрочено" list={overdue2} /><Section title="Сегодня" list={today2} /><Section title="На неделе" list={week2} /></>}
          </AppOverlay>
        );
      })()}

      {/* Overlay: Приоритеты */}
      {overlayMode === "priorities" && (() => {
        const byPriority = collectByPriority(maps);
        const sections = [
          { key: "high",   label: "Высокий",  color: "#F44336" },
          { key: "medium", label: "Средний",  color: "#FFC107" },
          { key: "low",    label: "Низкий",   color: "#4CAF50" },
        ];
        const total = byPriority.high.length + byPriority.medium.length + byPriority.low.length;
        return (
          <AppOverlay title="Приоритеты" theme={theme} onClose={closeOverlay}>
            {total === 0
              ? <div style={{ color: theme.textDim, padding: 30, textAlign: "center" }}>Нет задач с приоритетом</div>
              : sections.map(({ key, label, color }) => {
                const list = byPriority[key];
                return (
                  <div key={key} style={{ marginBottom: 28 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: theme.sectionLabel, textTransform: "uppercase", letterSpacing: 1.2 }}>
                        {label}
                      </span>
                      {list.length > 0 && (
                        <span style={{ fontSize: 11, color: theme.textFaint, fontWeight: 400 }}>· {list.length}</span>
                      )}
                    </div>
                    {list.length === 0
                      ? <div style={{ color: theme.textDim, fontSize: 13, padding: "6px 0 0 18px" }}>—</div>
                      : list.map(task => {
                        const co = COLORS[(task.colorIdx ?? 0) % COLORS.length];
                        const dl = task.deadline ? fmtDeadline(new Date(task.deadline)) : null;
                        return (
                          <div key={`${task.mapId}/${task.id}`}
                            onClick={() => { onNavigateTask?.(task.mapId, task.id); setOverlayMode(null); }}
                            style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", marginBottom: 4, background: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}`, borderRadius: 10, cursor: "pointer" }}
                            onMouseEnter={e => e.currentTarget.style.background = theme.surfaceBgHover}
                            onMouseLeave={e => e.currentTarget.style.background = theme.surfaceBg}>
                            <div style={{ width: 8, height: 36, borderRadius: 4, background: co.bg, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.text}</div>
                              <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>{task.mapName}</div>
                            </div>
                            {dl && <div style={{ fontSize: 12, fontWeight: 600, color: dl.color || theme.textDim, flexShrink: 0 }}>{dl.text}</div>}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
          </AppOverlay>
        );
      })()}

      {/* Overlay: Архив */}
      {overlayMode === "archive" && (() => {
        const items = collectArchived(maps);
        return (
          <AppOverlay title="Архив" theme={theme} onClose={closeOverlay}>
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
                      style={{ background: "transparent", border: `1px solid ${co.bg}`, color: co.bg, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "'Inter'", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      Восстановить
                    </button>
                  </div>
                );
              })}
          </AppOverlay>
        );
      })()}
    </div>
  );
}
