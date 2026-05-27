// Локальные уведомления для напоминаний о дедлайнах.
// На Android — нативные через @capacitor/local-notifications (срабатывают
// даже если приложение закрыто). В браузере — Notification API через
// setTimeout (работает пока вкладка открыта).

import { isNative } from "./platform";

// Стабильный numeric id из строкового taskId (нужен Capacitor LocalNotifications).
function hashId(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return Math.abs(h) % 2_000_000_000 + 1;
}

let permissionResult = null;

export async function ensureNotificationPermission() {
  if (permissionResult !== null) return permissionResult;
  try {
    if (isNative()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const r = await LocalNotifications.requestPermissions();
      permissionResult = r?.display === "granted";
    } else if (typeof window !== "undefined" && "Notification" in window) {
      let p = Notification.permission;
      if (p === "default") p = await Notification.requestPermission();
      permissionResult = p === "granted";
    } else {
      permissionResult = false;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[Mindes] notifications permission error", e);
    permissionResult = false;
  }
  return permissionResult;
}

// Web-таймеры храним по taskId, чтобы можно было перепланировать/отменить.
const webTimers = new Map();

const SAFE_MAX_TIMEOUT = 0x7fffffff; // ~24.8 дней

export async function scheduleReminder({ taskId, title, body, fireAt }) {
  if (!taskId || !fireAt) return;
  const fireDate = fireAt instanceof Date ? fireAt : new Date(fireAt);
  if (isNaN(fireDate.getTime())) return;
  const delay = fireDate.getTime() - Date.now();
  if (delay <= 0) return;

  if (isNative()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const id = hashId(taskId);
      // Сначала отменяем старое — Capacitor сам перезапишет, но на всякий случай.
      await LocalNotifications.cancel({ notifications: [{ id }] }).catch(() => {});
      await LocalNotifications.schedule({
        notifications: [{
          id,
          title: title || "Напоминание",
          body: body || "",
          // allowWhileIdle: true — alarm срабатывает даже в Doze-режиме,
          // когда устройство спит. Без него Android задерживает или глотает alarm.
          schedule: { at: fireDate, allowWhileIdle: true },
          // smallIcon не указываем — Capacitor использует иконку приложения
          // (на кастомный ресурс ic_stat_icon ссылаться нельзя, его нет).
        }],
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[Mindes] native schedule failed", e);
    }
  } else {
    // Web: setTimeout не справится с очень большими задержками.
    if (delay > SAFE_MAX_TIMEOUT) return;
    const old = webTimers.get(taskId);
    if (old) clearTimeout(old);
    const timer = setTimeout(() => {
      try {
        if (typeof window !== "undefined" && "Notification" in window
          && Notification.permission === "granted") {
          new Notification(title || "Напоминание", { body: body || "" });
        }
      } catch {}
      webTimers.delete(taskId);
    }, delay);
    webTimers.set(taskId, timer);
  }
}

export async function cancelReminder(taskId) {
  if (!taskId) return;
  if (isNative()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.cancel({ notifications: [{ id: hashId(taskId) }] });
    } catch {}
  } else {
    const t = webTimers.get(taskId);
    if (t) clearTimeout(t);
    webTimers.delete(taskId);
  }
}

// Сворачиваем все задачи дерева в плоский список для планировщика.
export function collectTasksWithReminders(tree) {
  const out = [];
  function walk(n) {
    if (n.deadline && n.remindBefore && !n.done) {
      out.push({
        id: n.id,
        text: n.text,
        deadline: n.deadline,
        remindBefore: n.remindBefore,
      });
    }
    for (const c of n.children || []) walk(c);
  }
  walk(tree);
  return out;
}
