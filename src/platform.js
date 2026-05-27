// Определение платформы (web vs. native Capacitor).
// Единая точка — не дублируем в auth.js и notifications.js.

import { Capacitor } from "@capacitor/core";

export const isNative = () => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};
