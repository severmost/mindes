// background.js — управление фоновым изображением пользователя.
// Хранит URL в Firestore users/{uid} (поля bgUrl + bgType).
// Файлы не загружаются — только внешние ссылки. Firebase Storage не нужен.

import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const settingsDoc = (uid) => doc(db, "users", uid);

// Сохраняет URL-ссылку в Firestore.
export async function saveBgUrl(uid, url) {
  await setDoc(settingsDoc(uid), { bgUrl: url, bgType: "url" }, { merge: true });
}

// Убирает фон.
export async function clearBg(uid) {
  await setDoc(settingsDoc(uid), { bgUrl: null, bgType: null }, { merge: true });
}

// Реактивный хук: слушает настройки пользователя из Firestore.
export function useBackground(uid) {
  const [bgUrl,     setBgUrl]     = useState(null);
  const [bgType,    setBgType]    = useState(null);
  const [bgLoading, setBgLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setBgLoading(false); return; }
    const unsub = onSnapshot(settingsDoc(uid), snap => {
      const data = snap.data() || {};
      setBgUrl(data.bgUrl   || null);
      setBgType(data.bgType || null);
      setBgLoading(false);
    }, () => { setBgLoading(false); });
    return unsub;
  }, [uid]);

  return { bgUrl, bgType, bgLoading };
}
