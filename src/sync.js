// Realtime-синхронизация карт пользователя с Firestore.
// Структура:
//   users/{uid}                       — поля: { activeMapId }
//   users/{uid}/maps/{mapId}          — { id, name, tree, updatedAt, createdAt }
//
// Хук возвращает локальное состояние + методы. Запись в облако дебаунсится,
// чтобы быстрые правки не били в Firestore слишком часто.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

const SAVE_DEBOUNCE_MS = 500;

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

function defaultTree(name) {
  return {
    id: "root",
    text: name,
    done: false,
    description: "",
    checklist: [],
    children: [],
  };
}

function sampleTree() {
  const id = () => makeId();
  return {
    id: "root",
    text: "Мои задачи",
    done: false,
    description: "",
    checklist: [],
    children: [
      {
        id: id(),
        text: "Работа",
        done: false,
        description: "",
        checklist: [],
        colorIdx: 0,
        children: [
          {
            id: id(),
            text: "Отправить отчёт",
            done: false,
            description: "Финальный отчёт за Q1",
            checklist: [
              { id: id(), text: "Собрать данные", done: true },
              { id: id(), text: "Оформить таблицы", done: false },
            ],
            children: [],
          },
          { id: id(), text: "Созвон с командой", done: true, description: "", checklist: [], children: [] },
        ],
      },
      {
        id: id(),
        text: "Учёба",
        done: false,
        description: "",
        checklist: [],
        colorIdx: 1,
        children: [
          { id: id(), text: "Прочитать главу 5", done: false, description: "", checklist: [], children: [] },
        ],
      },
      {
        id: id(),
        text: "Личное",
        done: false,
        description: "",
        checklist: [],
        colorIdx: 2,
        children: [
          {
            id: id(),
            text: "Купить продукты",
            done: false,
            description: "",
            checklist: [
              { id: id(), text: "Молоко", done: false },
              { id: id(), text: "Хлеб", done: false },
              { id: id(), text: "Яйца", done: false },
            ],
            children: [],
          },
          { id: id(), text: "Тренировка", done: false, description: "", checklist: [], children: [] },
        ],
      },
    ],
  };
}

export function useFirestoreSync(user) {
  const [maps, setMaps] = useState([]);
  const [activeMapId, setActiveMapId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Кеш локальных изменений, ожидающих записи: { [mapId]: { name, tree } }
  const pendingRef = useRef(new Map());
  const timerRef = useRef(null);
  const initializedRef = useRef(false);

  const userDocRef = useMemo(
    () => (user ? doc(db, "users", user.uid) : null),
    [user]
  );
  const mapsColRef = useMemo(
    () => (user ? collection(db, "users", user.uid, "maps") : null),
    [user]
  );

  // Подписка на список карт
  useEffect(() => {
    if (!user || !mapsColRef) {
      setMaps([]);
      setActiveMapId(null);
      setLoading(false);
      initializedRef.current = false;
      return;
    }
    setLoading(true);
    const q = query(mapsColRef, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(
      q,
      async (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || "Проект",
            tree: data.tree || defaultTree(data.name || "Проект"),
          };
        });

        initializedRef.current = true;
        setMaps(list);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user, mapsColRef]);

  // Подписка на activeMapId
  useEffect(() => {
    if (!user || !userDocRef) return;
    const unsub = onSnapshot(userDocRef, (snap) => {
      const data = snap.data();
      if (data?.activeMapId) setActiveMapId(data.activeMapId);
    });
    return () => unsub();
  }, [user, userDocRef]);

  // Если активная карта не выбрана / удалена — выбираем первую
  useEffect(() => {
    if (!maps.length) return;
    if (!activeMapId || !maps.find((m) => m.id === activeMapId)) {
      setActiveMapId(maps[0].id);
      if (userDocRef) {
        setDoc(userDocRef, { activeMapId: maps[0].id }, { merge: true }).catch(() => {});
      }
    }
  }, [maps, activeMapId, userDocRef]);

  // Дебаунс записи изменений в Firestore
  function flushPending() {
    if (!user || !pendingRef.current.size) return;
    const entries = Array.from(pendingRef.current.entries());
    pendingRef.current.clear();
    const batch = writeBatch(db);
    for (const [mapId, patch] of entries) {
      batch.set(
        doc(db, "users", user.uid, "maps", mapId),
        { ...patch, updatedAt: serverTimestamp() },
        { merge: true }
      );
    }
    batch.commit().catch((e) => setError(e));
  }

  function schedulePending() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flushPending, SAVE_DEBOUNCE_MS);
  }

  // Сохраняем при закрытии страницы / уходе в фон
  useEffect(() => {
    const onHide = () => flushPending();
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ───── API для UI ─────

  function updateTree(mapId, updater) {
    setMaps((prev) =>
      prev.map((m) => {
        if (m.id !== mapId) return m;
        const nextTree = typeof updater === "function" ? updater(m.tree) : updater;
        pendingRef.current.set(mapId, {
          ...(pendingRef.current.get(mapId) || {}),
          tree: nextTree,
        });
        schedulePending();
        return { ...m, tree: nextTree };
      })
    );
  }

  function renameMap(mapId, name) {
    setMaps((prev) =>
      prev.map((m) => {
        if (m.id !== mapId) return m;
        const nextTree = { ...m.tree, text: name };
        pendingRef.current.set(mapId, {
          ...(pendingRef.current.get(mapId) || {}),
          name,
          tree: nextTree,
        });
        schedulePending();
        return { ...m, name, tree: nextTree };
      })
    );
  }

  async function addMap() {
    if (!user) return;
    const id = makeId();
    const name = "Новый проект";
    const tree = defaultTree(name);
    setMaps((prev) => [...prev, { id, name, tree }]);
    setActiveMapId(id);
    if (userDocRef) {
      await setDoc(userDocRef, { activeMapId: id }, { merge: true });
    }
    await setDoc(doc(db, "users", user.uid, "maps", id), {
      id,
      name,
      tree,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async function deleteMap(mapId) {
    if (!user) return;
    setMaps((prev) => prev.filter((m) => m.id !== mapId));
    pendingRef.current.delete(mapId);
    await deleteDoc(doc(db, "users", user.uid, "maps", mapId));
  }

  function selectMap(mapId) {
    setActiveMapId(mapId);
    if (userDocRef) {
      setDoc(userDocRef, { activeMapId: mapId }, { merge: true }).catch(() => {});
    }
  }

  return {
    maps,
    activeMapId,
    loading,
    error,
    updateTree,
    renameMap,
    addMap,
    deleteMap,
    selectMap,
  };
}
