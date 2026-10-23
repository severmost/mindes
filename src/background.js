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
  const [state, setState] = useState({ uid: null, bgUrl: null, bgType: null, bgLoading: true });

  useEffect(() => {
    if (!uid) {
      setState({ uid: null, bgUrl: null, bgType: null, bgLoading: false });
      return;
    }
    setState({ uid, bgUrl: null, bgType: null, bgLoading: true });
    const unsub = onSnapshot(settingsDoc(uid), snap => {
      const data = snap.data() || {};
      setState({ uid, bgUrl: data.bgUrl || null, bgType: data.bgType || null, bgLoading: false });
    }, () => {
      setState({ uid, bgUrl: null, bgType: null, bgLoading: false });
    });
    return unsub;
  }, [uid]);

  return state.uid === uid
    ? { bgUrl: state.bgUrl, bgType: state.bgType, bgLoading: state.bgLoading }
    : { bgUrl: null, bgType: null, bgLoading: !!uid };
}
