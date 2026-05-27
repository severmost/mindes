// utils.js — чистые функции, константы и tree-хелперы.
// Нет импортов React, нет side-эффектов — только data-трансформации.

// ── Цвета проектов/задач ──────────────────────────────────────────────────────
export const COLORS = [
  { bg: "#E53935", light: "#FAD2D0", text: "#5C1614" },
  { bg: "#FB8C00", light: "#FCE0BF", text: "#5E3500" },
  { bg: "#FDD835", light: "#FCF1A8", text: "#4F4308" },
  { bg: "#7CB342", light: "#DBE9C5", text: "#2D4A14" },
  { bg: "#2E7D32", light: "#C8E0C9", text: "#0F3611" },
  { bg: "#00897B", light: "#BFE2DC", text: "#003C36" },
  { bg: "#039BE5", light: "#BFE2F5", text: "#013F5E" },
  { bg: "#1E88E5", light: "#C7DEF7", text: "#0B3766" },
  { bg: "#5E35B1", light: "#D7CDED", text: "#291650" },
  { bg: "#8E24AA", light: "#E1C7E9", text: "#3F0F4D" },
  { bg: "#D81B60", light: "#F6CADA", text: "#5C0B2B" },
  { bg: "#6D4C41", light: "#D8C9C2", text: "#2E1B14" },
];

// ── Приоритеты ────────────────────────────────────────────────────────────────
export const PRIORITY_COLORS = {
  low:    { bg: "#4CAF50", label: "Низкая" },
  medium: { bg: "#FFC107", label: "Средняя" },
  high:   { bg: "#F44336", label: "Высокая" },
};

// ── Бренд ─────────────────────────────────────────────────────────────────────
export const BRAND_COLOR = "#5b3fc4";

// ── ID-генератор ──────────────────────────────────────────────────────────────
export const genId = () => Math.random().toString(36).slice(2, 9);

// ── Работа с датами ───────────────────────────────────────────────────────────

/** ISO-строка → значение для <input type="datetime-local"> */
export function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Значение datetime-local → ISO-строка (или null) */
export function fromLocalInput(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Форматирует дедлайн для отображения в карточках и списках.
 * @param {string|null} iso — ISO-строка дедлайна
 * @returns {{ text: string, color: string|null } | null}
 */
export function formatDeadline(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const time    = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const dateStr = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
  if (d < now)                               return { text: "просрочено",       color: "#F44336" };
  if (d.toDateString() === now.toDateString()) return { text: `сегодня ${time}`, color: "#FB8C00" };
  const tom = new Date(now); tom.setDate(tom.getDate() + 1);
  if (d.toDateString() === tom.toDateString()) return { text: `завтра ${time}`,  color: "#FFC107" };
  return { text: `${dateStr} ${time}`, color: null };
}

// ── Счётчики задач ────────────────────────────────────────────────────────────

/**
 * Рекурсивно считает задачи по приоритетам в одном дереве (не собирает объекты).
 * Используется в StatsBar и подобных компонентах.
 */
export function countByPriority(node) {
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

/** Рекурсивно считает все задачи-листья в поддереве, исключая архивные. */
export function countTasks(n) {
  if (!n || n.archived) return { total: 0, done: 0 };
  if ((n.children || []).length === 0) return { total: 1, done: n.done ? 1 : 0 };
  let t = 0, d = 0;
  for (const c of n.children) { const r = countTasks(c); t += r.total; d += r.done; }
  return { total: t, done: d };
}

/** Только прямые дети (не внуки), исключая архивные — для счётчика на карточке. */
export function countDirectKids(node) {
  if (!node) return { total: 0, done: 0 };
  const kids = (node.children || []).filter(c => !c.archived);
  return { total: kids.length, done: kids.filter(c => c.done).length };
}

// ── Сбор данных по картам ─────────────────────────────────────────────────────

/**
 * Возвращает все незавершённые задачи с дедлайном, разбитые по бакетам:
 * "overdue" / "today" / "week".
 */
export function collectByDeadline(maps) {
  const now        = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const weekEnd    = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
  const out = [];

  for (const m of maps) {
    if (!m?.tree) continue;
    const walk = (node) => {
      if (node.deadline && !node.done) {
        const d = new Date(node.deadline);
        if (!isNaN(d.getTime())) {
          let bucket;
          if (d < todayStart)      bucket = "overdue";
          else if (d <= todayEnd)  bucket = "today";
          else if (d <= weekEnd)   bucket = "week";
          if (bucket) out.push({
            id: node.id, text: node.text || "(без названия)",
            deadline: node.deadline, priority: node.priority,
            colorIdx: node.colorIdx, mapId: m.id, mapName: m.name,
            time: d.getTime(), bucket,
          });
        }
      }
      for (const c of node.children || []) walk(c);
    };
    walk(m.tree);
  }
  out.sort((a, b) => a.time - b.time);
  return out;
}

/** Возвращает все архивированные задачи по всем картам. */
export function collectArchived(maps) {
  const out = [];
  for (const m of maps) {
    if (!m?.tree) continue;
    const walk = (node) => {
      if (node.archived) {
        out.push({ id: node.id, text: node.text || "(без названия)", colorIdx: node.colorIdx, mapId: m.id, mapName: m.name });
      } else {
        for (const c of node.children || []) walk(c);
      }
    };
    walk(m.tree);
  }
  return out;
}

/** Возвращает незавершённые задачи с приоритетом, сгруппированные по уровню. */
export function collectByPriority(maps) {
  const out = { high: [], medium: [], low: [] };
  for (const m of maps) {
    if (!m?.tree) continue;
    const walk = (node) => {
      if (!node.done && node.priority && out[node.priority]) {
        out[node.priority].push({
          id: node.id, text: node.text || "(без названия)",
          colorIdx: node.colorIdx, mapId: m.id, mapName: m.name,
          deadline: node.deadline || null,
        });
      }
      for (const c of node.children || []) walk(c);
    };
    walk(m.tree);
  }
  return out;
}

// ── Tree-хелперы (иммутабельное дерево задач) ─────────────────────────────────

export function updateNode(tree, id, fn) {
  if (tree.id === id) return fn(tree);
  return { ...tree, children: (tree.children || []).map(c => updateNode(c, id, fn)) };
}

export function findNode(tree, id) {
  if (!tree) return null;
  if (tree.id === id) return tree;
  for (const c of tree.children || []) { const r = findNode(c, id); if (r) return r; }
  return null;
}

export function findPath(tree, targetId, acc = []) {
  const path = [...acc, tree.id];
  if (tree.id === targetId) return path;
  for (const c of tree.children || []) { const r = findPath(c, targetId, path); if (r) return r; }
  return null;
}

export function removeNode(tree, id) {
  return { ...tree, children: (tree.children || []).filter(c => c.id !== id).map(c => removeNode(c, id)) };
}

export function addChild(tree, pid, child) {
  if (tree.id === pid) return { ...tree, children: [...(tree.children || []), child] };
  return { ...tree, children: (tree.children || []).map(c => addChild(c, pid, child)) };
}

export function setAllDone(n, done) {
  return { ...n, done, children: (n.children || []).map(c => setAllDone(c, done)) };
}

export function isAllDone(n) {
  const { total, done } = countTasks(n);
  return n.done || (total > 0 && done === total);
}

/** Определяет colorIdx узла с учётом наследования от родителя и позиции. */
export function getNodeColor(node, parentColorIdx, posIdx) {
  if (node.colorIdx !== undefined && node.colorIdx !== null) return node.colorIdx;
  if (parentColorIdx !== undefined && parentColorIdx !== null) return parentColorIdx;
  return posIdx;
}

// ── Повтор задач ──────────────────────────────────────────────────────────────

/** Вычисляет следующий дедлайн для повторяющейся задачи. */
export function calcNextDeadline(iso, repeat) {
  const d = new Date(iso);
  if (repeat.type === "daily")        d.setDate(d.getDate() + 1);
  else if (repeat.type === "weekly")  d.setDate(d.getDate() + 7);
  else if (repeat.type === "monthly") d.setMonth(d.getMonth() + 1);
  else if (repeat.type === "custom")  d.setDate(d.getDate() + Math.max(1, repeat.every || 1));
  return d.toISOString();
}

// ── Статистика ветки (для BranchStats-панели) ─────────────────────────────────

/**
 * Рекурсивно обходит поддерево и собирает:
 * - total / done для листьев
 * - количество задач по приоритетам
 * - ближайшие дедлайны (не более 8)
 */
export function collectBranchStats(node) {
  let total = 0, done = 0;
  const pri = { high: 0, medium: 0, low: 0 };
  const deadlines = [];
  const walk = (n) => {
    if ((n.children || []).length === 0) { total++; if (n.done) done++; }
    if (!n.done) {
      if (n.priority && pri[n.priority] !== undefined) pri[n.priority]++;
      if (n.deadline) {
        const d = new Date(n.deadline);
        if (!isNaN(d.getTime())) deadlines.push({ id: n.id, text: n.text || "—", deadline: d, time: d.getTime() });
      }
    }
    for (const c of n.children || []) walk(c);
  };
  walk(node);
  deadlines.sort((a, b) => a.time - b.time);
  return { total, done, pri, deadlines: deadlines.slice(0, 8) };
}
