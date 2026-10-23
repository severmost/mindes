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
import { useLocale } from "./i18n.jsx";
import { applyMapChange, editMapTree, editMapDetails, overlayMapSnapshot, isMapWriteAcknowledged } from "./map-state.js";

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

export function useFirestoreSync(user) {
  const { t } = useLocale();
  const [maps, setMaps] = useState([]);
  const [activeMapId, setActiveMapId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadedUid, setLoadedUid] = useState(null);
  const [activeMapLoadedUid, setActiveMapLoadedUid] = useState(null);

  // Кеш локальных изменений, ожидающих записи: { [mapId]: { name, tree } }
  const pendingRef = useRef(new Map());
  const inFlightRef = useRef(new Map());
  const optimisticMapsRef = useRef(new Map());
  const mapsRef = useRef([]);
  const timerRef = useRef(null);
  const currentUidRef = useRef(user?.uid);
  currentUidRef.current = user?.uid;

  const userDocRef = useMemo(
    () => (user ? doc(db, "users", user.uid) : null),
    [user]
  );
  const mapsColRef = useMemo(
    () => (user ? collection(db, "users", user.uid, "maps") : null),
    [user]
  );

  useEffect(() => { setError(null); }, [user?.uid]);

  // Подписка на список карт
  useEffect(() => {
    if (!user || !mapsColRef) {
      mapsRef.current = [];
      setMaps([]);
      setActiveMapId(null);
      setLoading(false);
      setLoadedUid(null);
      setActiveMapLoadedUid(null);
      return;
    }
    setLoading(true);
    let subscribed = true;
    const q = query(mapsColRef, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      async (snap) => {
        if (!subscribed || currentUidRef.current !== user.uid) return;
        const list = snap.docs.map((d) => {
          const data = d.data();
          if (optimisticMapsRef.current.get(d.id)?.uid === user.uid) {
            optimisticMapsRef.current.delete(d.id);
          }
          const local = pendingRef.current.get(d.id);
          const writing = inFlightRef.current.get(d.id);
          if (writing?.uid === user.uid && isMapWriteAcknowledged(data, d.metadata.hasPendingWrites, writing)) {
            inFlightRef.current.delete(d.id);
          }
          const pending = local?.uid === user.uid ? local : null;
          const inFlight = inFlightRef.current.get(d.id)?.uid === user.uid
            ? inFlightRef.current.get(d.id) : null;
          return overlayMapSnapshot(d.id, data, pending, inFlight, defaultTree, t("common.untitled"));
        });
        for (const entry of optimisticMapsRef.current.values()) {
          if (entry.uid === user.uid) list.push(entry.map);
        }

        mapsRef.current = list;
        setMaps(list);
        setLoadedUid(user.uid);
        setLoading(false);
      },
      (err) => {
        if (!subscribed || currentUidRef.current !== user.uid) return;
        setError(err);
        mapsRef.current = [];
        setMaps([]);
        setLoadedUid(user.uid);
        setLoading(false);
      }
    );
    return () => { subscribed = false; unsub(); };
  }, [user, mapsColRef, t]);

  // Подписка на activeMapId
  useEffect(() => {
    if (!user || !userDocRef) return;
    let subscribed = true;
    const unsub = onSnapshot(userDocRef, (snap) => {
      if (!subscribed || currentUidRef.current !== user.uid) return;
      setActiveMapId(snap.data()?.activeMapId || null);
      setActiveMapLoadedUid(user.uid);
    }, (err) => {
      if (!subscribed || currentUidRef.current !== user.uid) return;
      setError(err);
      setActiveMapId(null);
      setActiveMapLoadedUid(user.uid);
    });
    return () => { subscribed = false; unsub(); };
  }, [user, userDocRef]);

  // Если активная карта не выбрана / удалена — выбираем первую
  useEffect(() => {
    if (!maps.length || loadedUid !== user?.uid || activeMapLoadedUid !== user?.uid) return;
    if (!activeMapId || !maps.find((m) => m.id === activeMapId)) {
      setActiveMapId(maps[0].id);
      if (userDocRef) {
        setDoc(userDocRef, { activeMapId: maps[0].id }, { merge: true }).catch((e) => {
          if (currentUidRef.current === user?.uid) setError(e);
        });
      }
    }
  }, [maps, activeMapId, userDocRef, loadedUid, activeMapLoadedUid, user?.uid]);

  // Дебаунс записи изменений в Firestore
  function flushPending() {
    if (!user || !pendingRef.current.size) return;
    const entries = Array.from(pendingRef.current.entries()).filter(([, patch]) => patch.uid === user.uid);
    if (!entries.length) return;
    const batch = writeBatch(db);
    const writes = [];
    for (const [mapId, patch] of entries) {
      pendingRef.current.delete(mapId);
      const writing = { ...patch, writeId: makeId() };
      inFlightRef.current.set(mapId, writing);
      writes.push([mapId, patch, writing]);
      const { uid, ...fields } = patch;
      batch.set(
        doc(db, "users", user.uid, "maps", mapId),
        { ...fields, clientWriteId: writing.writeId, updatedAt: serverTimestamp() },
        { merge: true }
      );
    }
    batch.commit().then(() => {
      if (currentUidRef.current === user.uid) setError(null);
    }).catch((e) => {
      for (const [mapId, patch, writing] of writes) {
        if (inFlightRef.current.get(mapId) === writing) {
          inFlightRef.current.delete(mapId);
          const newer = pendingRef.current.get(mapId);
          if (!newer || newer.uid === patch.uid) {
            pendingRef.current.set(mapId, { ...patch, ...newer });
          }
        }
      }
      if (currentUidRef.current === user.uid) setError(e);
    });
  }

  function schedulePending() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flushPending, SAVE_DEBOUNCE_MS);
  }

  function changeMap(mapId, change) {
    if (!user || loadedUid !== user.uid) return;
    const next = applyMapChange(mapsRef.current, mapId, change);
    if (!next) return;
    mapsRef.current = next.maps;
    setMaps(next.maps);
    const previous = pendingRef.current.get(mapId);
    pendingRef.current.set(mapId, {
      ...(previous?.uid === user.uid ? previous : { uid: user.uid }),
      ...next.patch,
    });
    schedulePending();
  }

  // Сохраняем при закрытии страницы / уходе в фон
  useEffect(() => {
    const onHide = () => flushPending();
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      flushPending();
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ───── API для UI ─────

  function updateTree(mapId, updater) {
    changeMap(mapId, (m) => editMapTree(m, updater));
  }

  function saveMapDetails(mapId, changes) {
    if (!Object.keys(changes).length) return;
    changeMap(mapId, (m) => editMapDetails(m, changes));
  }

  async function addMap() {
    if (!user) return;
    const id = makeId();
    const name = t("home.defaultProject");
    const tree = defaultTree(name);
    optimisticMapsRef.current.set(id, { uid: user.uid, map: { id, name, tree } });
    const nextMaps = [...mapsRef.current, { id, name, tree }];
    mapsRef.current = nextMaps;
    setMaps(nextMaps);
    setActiveMapId(id);
    setActiveMapLoadedUid(user.uid);
    const batch = writeBatch(db);
    batch.set(userDocRef, { activeMapId: id }, { merge: true });
    batch.set(doc(db, "users", user.uid, "maps", id), {
      id,
      name,
      tree,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    try {
      await batch.commit();
      if (currentUidRef.current === user.uid) setError(null);
    } catch (e) {
      optimisticMapsRef.current.delete(id);
      if (currentUidRef.current === user.uid) {
        const remaining = mapsRef.current.filter((m) => m.id !== id);
        mapsRef.current = remaining;
        setMaps(remaining);
        setError(e);
      }
    }
  }

  async function deleteMap(mapId) {
    if (!user) return;
    const nextMaps = mapsRef.current.filter((m) => m.id !== mapId);
    mapsRef.current = nextMaps;
    setMaps(nextMaps);
    pendingRef.current.delete(mapId);
    inFlightRef.current.delete(mapId);
    optimisticMapsRef.current.delete(mapId);
    try {
      await deleteDoc(doc(db, "users", user.uid, "maps", mapId));
      if (currentUidRef.current === user.uid) setError(null);
    } catch (e) {
      if (currentUidRef.current === user.uid) setError(e);
    }
  }

  function selectMap(mapId) {
    setActiveMapId(mapId);
    if (user) setActiveMapLoadedUid(user.uid);
    if (userDocRef) {
      setDoc(userDocRef, { activeMapId: mapId }, { merge: true }).catch((e) => {
        if (currentUidRef.current === user?.uid) setError(e);
      });
    }
  }

  return {
    maps: loadedUid === user?.uid ? maps : [],
    activeMapId: loadedUid === user?.uid && activeMapLoadedUid === user?.uid ? activeMapId : null,
    loading: user && loadedUid !== user.uid ? true : loading,
    error,
    updateTree,
    saveMapDetails,
    addMap,
    deleteMap,
    selectMap,
  };
}
